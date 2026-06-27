import { useEffect, useRef, useState } from 'react';
import './App.css';
import './enhancements.css';

import { isAuthenticated, logout, getCurrentUser, getMe, saveToken, ACTIVITY_KEY } from './api/auth';
import { addToCart, getCartCount }                        from './api/cart';
import { useDarkMode }   from './hooks/useDarkMode';
import { useIdleLogout } from './hooks/useIdleLogout';
import TopNavBar         from './components/TopNavBar';
import Footer            from './components/Footer';
import LoginPage         from './pages/Login';
import SignUpPage        from './pages/SignUp';
import ForgotPasswordPage from './pages/ForgotPassword';
import GoogleVerifyPage  from './pages/GoogleVerify';
import WelcomePage       from './pages/Welcome';
import HomePage          from './pages/Home';
import ProductsPage      from './pages/Products';
import ProductDetailPage from './pages/ProductDetail';
import PointsPage        from './pages/Points';
import CartPage          from './pages/Cart';
import ProfilePage       from './pages/Profile';
import EditProfilePage   from './pages/EditProfile';
import AdminApp          from './pages/admin/AdminApp';

// The admin dashboard lives behind the "#admin" URL hash (e.g.
// http://localhost:3000/#admin). Each sub-page adds a slug, e.g.
// "#admin/vouchers" — so match the bare route and any "admin/…" slug.
const isAdminRoute = () => {
  const hash = window.location.hash.replace(/^#\/?/, '');
  return hash === 'admin' || hash.startsWith('admin/');
};

const consumeGoogleRedirect = () => {
  if (window.location.pathname !== '/auth/google/success') return null;

  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const otp = params.get('otp');
  const email = params.get('email');

  window.history.replaceState({}, '', '/');

  if (token) {
    saveToken(token);
    return { type: 'session' };
  }
 
  if (otp === 'required' && email) {
    return { type: 'otp', email };
  }
  return null;
};

const PAGE_TO_PATH = {
  welcome: '/welcome',
  login: '/login',
  signup: '/signup',
  'forgot-password': '/forgot-password',
  'google-verify': '/google-verify',
  home: '/home',
  products: '/products',
  cart: '/cart',
  points: '/points',
  profile: '/profile',
  'edit-profile': '/profile/edit',
};

// Pages a signed-out visitor is allowed to land on directly.
const PUBLIC_PAGES = new Set([
  'welcome',
  'login',
  'signup',
  'forgot-password',
  'google-verify',
]);

const pageToPath = (page, voucherId) =>
  page === 'product-detail'
    ? `/products/${voucherId ?? ''}`
    : PAGE_TO_PATH[page] || '/';

const pathToState = () => {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const detail = path.match(/^\/products\/(.+)$/);
  if (detail) return { page: 'product-detail', voucherId: decodeURIComponent(detail[1]) };
  const match = Object.entries(PAGE_TO_PATH).find(([, p]) => p === path);
  return match ? { page: match[0], voucherId: null } : null;
};

const resolveTarget = (target, authed) => {
  if (!target) return { page: authed ? 'home' : 'welcome', voucherId: null };
  if (authed && PUBLIC_PAGES.has(target.page)) return { page: 'home', voucherId: null };
  if (!authed && !PUBLIC_PAGES.has(target.page)) return { page: 'welcome', voucherId: null };
  return target;
};

const App = () => {
  const [googleRedirect] = useState(consumeGoogleRedirect);
  const [page, setPage] = useState(() => {
    if (googleRedirect?.type === 'session') return 'home';
    if (googleRedirect?.type === 'otp') return 'google-verify';
    return resolveTarget(pathToState(), isAuthenticated()).page;
  });
  const [selectedVoucherId, setSelectedVoucherId] = useState(() => {
    if (googleRedirect) return null;
    return resolveTarget(pathToState(), isAuthenticated()).voucherId;
  });
  const [cartCount, setCartCount] = useState(0);
  const [loginNotice, setLoginNotice] = useState('');
  const [user, setUser] = useState(() => getCurrentUser());
  const { isDark, toggle: toggleTheme } = useDarkMode();
  const [adminRoute, setAdminRoute] = useState(() => isAdminRoute());
  useEffect(() => {
    const onHashChange = () => setAdminRoute(isAdminRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Keep the address bar in sync with the current page so each view has its own
  // URL (e.g. /login, /products, /products/<id>). The first sync replaces the
  // entry so we don't leave a stray "/" in the back history.
  const didSyncUrl = useRef(false);
  useEffect(() => {
    if (adminRoute) return; // don't fight the "#admin" hash route
    const target = pageToPath(page, selectedVoucherId);
    if (window.location.pathname !== target) {
      const method = didSyncUrl.current ? 'pushState' : 'replaceState';
      window.history[method]({ page, voucherId: selectedVoucherId }, '', target);
    }
    didSyncUrl.current = true;
  }, [page, selectedVoucherId, adminRoute]);

  // Browser back/forward → restore the matching page from the URL.
  useEffect(() => {
    const onPopState = () => {
      if (isAdminRoute()) {
        setAdminRoute(true);
        return;
      }
      setAdminRoute(false);
      const restored = resolveTarget(pathToState(), isAuthenticated());
      setPage(restored.page);
      setSelectedVoucherId(restored.voucherId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const refreshCartCount = () => {
    getCartCount().then(setCartCount).catch(() => {});
  };

  const handleAddToCart = (voucherId) =>
    addToCart(voucherId).then((result) => {
      refreshCartCount();
      return result;
    });

  useEffect(() => {
    if (isAuthenticated()) {
      getMe().then(setUser).catch(() => {});
      refreshCartCount();
    }
  }, []);

  // Navigate to a top-level page
  const handleNavigate = (target) => {
    setPage(target);
    setSelectedVoucherId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // "Explore" on any voucher card → detail page
  const handleExplore = (voucherId) => {
    setSelectedVoucherId(voucherId);
    setPage('product-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Clear the saved session and return to the Login screen.
  const handleLogout = () => {
    logout();
    setUser(null);
    setSelectedVoucherId(null);
    setCartCount(0);
    setLoginNotice('');
    setPage('login');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Same teardown as a manual logout, but tell the user why they're back at the
  // sign-in screen. Triggered by the inactivity timer below.
  const handleIdleLogout = () => {
    logout();
    setUser(null);
    setSelectedVoucherId(null);
    setCartCount(0);
    setPage('login');
    setLoginNotice('You were signed out due to 30 minutes of inactivity. Please sign in again.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Auto sign-out after 30 minutes with no activity. Only armed while a user is
  // signed in; any mouse/keyboard/touch/scroll resets the window.
  useIdleLogout({
    enabled: Boolean(user),
    onIdle: handleIdleLogout,
    storageKey: ACTIVITY_KEY,
  });

  // Back from detail → products list (or home if that's where they came from)
  const handleBack = () => {
    setPage('products');
    setSelectedVoucherId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activePage =
    page === 'home'
      ? 'home'
      : page === 'points'
      ? 'points'
      : page === 'cart'
      ? 'cart' 
      : page === 'profile' || page === 'edit-profile'
      ? 'profile'
      : 'products'; 

  // Admin dashboard is a standalone experience (own auth + chrome). Render it
  // whenever the URL is "#admin"
  if (adminRoute) {
    return <AdminApp />;
  }

  if (page === 'welcome') {
    return (
      <div className="app-shell">
        <div className="page-transition" key="welcome">
        <WelcomePage
          onGetStarted={() => {
            setLoginNotice('');
            setPage('signup');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onSignIn={() => {
            setLoginNotice('');
            setPage('login');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
        </div>
      </div>
    );
  }

  if (page === 'login') {
    return (
      <div className="app-shell">
        <div className="page-transition" key="login">
        <LoginPage
          notice={loginNotice}
          onSuccess={() => {
            setUser(getCurrentUser());
            handleNavigate('home');
          }}
          onCreateAccount={() => {
            setLoginNotice('');
            setPage('signup');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onForgotPassword={() => {
            setLoginNotice('');
            setPage('forgot-password');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
        </div>
      </div>
    );
  }

  if (page === 'forgot-password') {
    return (
      <div className="app-shell">
        <div className="page-transition" key="forgot-password">
        <ForgotPasswordPage
          onSuccess={() => {
            setLoginNotice('Password reset successfully. Please sign in.');
            setPage('login');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onBackToLogin={() => {
            setLoginNotice('');
            setPage('login');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
        </div>
      </div>
    );
  }

  if (page === 'signup') {
    return (
      <div className="app-shell">
        <div className="page-transition" key="signup">
        <SignUpPage
          onSuccess={() => {
            setLoginNotice('Account created successfully. Please sign in.');
            setPage('login');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onSignIn={() => {
            setLoginNotice('');
            setPage('login');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
        </div>
      </div>
    );
  }

  if (page === 'google-verify') {
    return (
      <div className="app-shell">
        <div className="page-transition" key="google-verify">
        <GoogleVerifyPage
          email={googleRedirect?.email}
          onSuccess={() => {
            setUser(getCurrentUser());
            handleNavigate('home');
          }}
          onCancel={() => {
            setLoginNotice('');
            setPage('login');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <TopNavBar
        activePage={activePage}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        user={user}
        onViewCart={() => handleNavigate('cart')}
        cartCount={cartCount}
      />

      <div className="page-transition" key={page === 'product-detail' ? `detail-${selectedVoucherId}` : page}>
      {page === 'home' && (
        <HomePage onExplore={handleExplore} onViewAll={() => handleNavigate('products')} />
      )}

      {page === 'products' && (
        <ProductsPage onSelectProduct={handleExplore} />
      )}

      {page === 'product-detail' && (
        <ProductDetailPage
          voucherId={selectedVoucherId}
          onBack={handleBack}
          onAddToCart={handleAddToCart}
          onRedeemed={() => getMe().then(setUser).catch(() => {})}
        />
      )}

      {page === 'cart' && (
        <CartPage
          onContinueShopping={() => handleNavigate('products')}
          onCartChange={setCartCount}
        />
      )}

      {page === 'points' && (
        <PointsPage onRedeem={() => handleNavigate('products')} />
      )}

      {page === 'profile' && (
        <ProfilePage user={user} onNavigate={handleNavigate} />
      )}

      {page === 'edit-profile' && (
        <EditProfilePage
          user={user}
          onSaved={(updated) => {
            setUser(updated);
            handleNavigate('profile');
          }}
          onCancel={() => handleNavigate('profile')}
        />
      )}
      </div>

      <Footer />
    </div>
  );
};

export default App;