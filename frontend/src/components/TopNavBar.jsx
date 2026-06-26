import { useEffect, useState } from 'react';

/**
 * @param {{ activePage: 'home' | 'products' | 'points' | 'profile' | 'cart', onNavigate: (page: string) => void, onLogout: () => void, isDark?: boolean, onToggleTheme?: () => void, user?: { avatar?: string }, onViewCart?: () => void, cartCount?: number }} props
 */
const TopNavBar = ({ activePage = 'home', onNavigate, onLogout, isDark = false, onToggleTheme, user, onViewCart, cartCount = 0 }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const nav = (page) => (e) => {
    e.preventDefault();
    onNavigate?.(page);
  };

  // Navigate from the mobile drawer: close the drawer first, then route.
  const goMobile = (page) => () => {
    setMenuOpen(false);
    onNavigate?.(page);
  };

  const linkClass = (page) =>
    `nav-link${activePage === page ? ' nav-link--active' : ''}`;

  // Lock body scroll + close on Escape while the mobile drawer is open.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  // Snap the drawer shut if the viewport grows to the desktop layout.
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setMenuOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const mobileItems = [
    { key: 'home', label: 'Homepage', icon: 'home', onClick: goMobile('home') },
    { key: 'products', label: 'Vouchers', icon: 'confirmation_number', onClick: goMobile('products') },
    { key: 'points', label: 'Points', icon: 'stars', onClick: goMobile('points') },
    {
      key: 'cart',
      label: 'Cart',
      icon: 'shopping_cart',
      badge: cartCount,
      onClick: () => {
        setMenuOpen(false);
        onViewCart?.();
      },
    },
    { key: 'profile', label: 'Profile', icon: 'account_circle', onClick: goMobile('profile') },
  ];

  return (
    <header className="nav-bar">
      <div className="nav-bar__inner container-max page-px">

        {/* Brand */}
        <button className="nav-bar__brand" type="button" onClick={nav('home')}>
          <span
            className="material-symbols-outlined"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            confirmation_number
          </span>
          CartRedeem
        </button>

        {/* Desktop Navigation Links */}
        <nav className="nav-bar__links">
          <button className={linkClass('home')} type="button" onClick={nav('home')}>Homepage</button>
          <button className={linkClass('products')} type="button" onClick={nav('products')}>Vouchers</button>
          <button className={linkClass('points')} type="button" onClick={nav('points')}>Points</button>
        </nav>

        {/* Trailing Actions */}
        <div className="nav-bar__actions">
          <div className="nav-bar__desktop-actions">
            <button
              className={`icon-btn nav-bar__cart${activePage === 'cart' ? ' nav-bar__cart--active' : ''}`}
              type="button"
              onClick={() => onViewCart?.()}
              aria-label={`View Cart${cartCount > 0 ? ` (${cartCount} items)` : ''}`}
            >
              <span className="material-symbols-outlined">shopping_cart</span>
              {cartCount > 0 && <span className="nav-bar__cart-badge">{cartCount}</span>}
            </button>
            <button
              className="icon-btn"
              type="button"
              onClick={() => onToggleTheme?.()}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-pressed={isDark}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <span className="material-symbols-outlined">
                {isDark ? 'light_mode' : 'dark_mode'}
              </span>
            </button>
            <button
              className={`nav-bar__avatar${activePage === 'profile' ? ' nav-bar__avatar--active' : ''}`}
              type="button"
              onClick={nav('profile')}
              aria-label="View your profile"
              aria-current={activePage === 'profile' ? 'page' : undefined}
              title="Your profile"
            >
              {user?.avatar ? (
                <img src={user.avatar} alt="Your profile" />
              ) : (
                <span className="material-symbols-outlined nav-bar__avatar-icon">account_circle</span>
              )}
            </button>
            <button className="logout-btn" type="button" onClick={() => onLogout?.()}>
              <span className="material-symbols-outlined">logout</span>
              Logout
            </button>
          </div>

          {/* Mobile Hamburger */}
          <button
            className="nav-bar__hamburger"
            type="button"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="nav-mobile-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="material-symbols-outlined">{menuOpen ? 'close' : 'menu'}</span>
            {!menuOpen && cartCount > 0 && <span className="nav-bar__hamburger-dot" aria-hidden="true" />}
          </button>
        </div>

      </div>

      {/* Mobile slide-in drawer (kept mounted so it can animate open AND closed) */}
      <div
        id="nav-mobile-menu"
        className={`nav-mobile${menuOpen ? ' nav-mobile--open' : ''}`}
      >
        <button
          type="button"
          className="nav-mobile__backdrop"
          aria-label="Close menu"
          tabIndex={menuOpen ? 0 : -1}
          onClick={() => setMenuOpen(false)}
        />

        <nav className="nav-mobile__panel" aria-label="Main menu" aria-hidden={!menuOpen}>
          <div className="nav-mobile__header">
            <span className="nav-bar__brand nav-mobile__brand">
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                confirmation_number
              </span>
              CartRedeem
            </span>
            <button
              type="button"
              className="icon-btn"
              aria-label="Close menu"
              tabIndex={menuOpen ? 0 : -1}
              onClick={() => setMenuOpen(false)}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="nav-mobile__links">
            {mobileItems.map((item, i) => (
              <button
                key={item.key}
                type="button"
                className={`nav-mobile__link${activePage === item.key ? ' nav-mobile__link--active' : ''}`}
                style={{ '--i': i }}
                tabIndex={menuOpen ? 0 : -1}
                onClick={item.onClick}
              >
                <span className="material-symbols-outlined nav-mobile__link-icon">{item.icon}</span>
                <span className="nav-mobile__link-label">{item.label}</span>
                {item.badge > 0 && <span className="nav-mobile__link-badge">{item.badge}</span>}
                <span className="material-symbols-outlined nav-mobile__link-chevron">chevron_right</span>
              </button>
            ))}
          </div>

          <div className="nav-mobile__footer">
            <button
              type="button"
              className="nav-mobile__theme"
              tabIndex={menuOpen ? 0 : -1}
              onClick={() => onToggleTheme?.()}
            >
              <span className="material-symbols-outlined">{isDark ? 'light_mode' : 'dark_mode'}</span>
              {isDark ? 'Light mode' : 'Dark mode'}
            </button>
            <button
              type="button"
              className="logout-btn nav-mobile__logout"
              tabIndex={menuOpen ? 0 : -1}
              onClick={() => {
                setMenuOpen(false);
                onLogout?.();
              }}
            >
              <span className="material-symbols-outlined">logout</span>
              Logout
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default TopNavBar;
