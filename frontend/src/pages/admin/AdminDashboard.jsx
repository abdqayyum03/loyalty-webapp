import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getStatistics,
  getAllUsers,
  getAllOrders,
  activateUser,
  deactivateUser,
  updateUserRole,
  downloadOrderPDF,
  getAdminErrorMessage,
} from '../../api/admin';
import { useDarkMode } from '../../hooks/useDarkMode';
import AdminOrder from './AdminOrder';
import AdminVouchers from './AdminVouchers';
import AdminCategories from './AdminCategories';

const formatNumber = (n) => Number(n || 0).toLocaleString();

// Compact form for large figures (e.g. the points liability card): 2,400,000 → "2.4M".
const formatCompact = (n) => {
  const num = Number(n || 0);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(num);
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-MY', { year: 'numeric', month: 'short', day: 'numeric' });
};

// The five headline metrics returned by GET /api/admin/statistics, mapped to the
// cards rendered on the Overview tab. `tone` selects the icon badge colour and
// `trend` is the small indicator shown in the card's top-right corner.
const STAT_CARDS = [
  { key: 'totalActiveAccounts', label: 'Active Accounts', icon: 'group',               tone: 'primary',        trend: '+2%',    trendType: 'up' },
  { key: 'totalOrders',         label: 'Total Orders',    icon: 'shopping_bag',         tone: 'secondary',      trend: '—',      trendType: 'flat' },
  { key: 'totalPointsRedeemed', label: 'Points Redeemed', icon: 'stars',                tone: 'tertiary-soft',  trend: '—',      trendType: 'flat' },
  { key: 'totalVouchers',       label: 'Vouchers',        icon: 'confirmation_number',  tone: 'primary-soft',   trend: '+1',     trendType: 'up' },
  { key: 'totalCategories',     label: 'Categories',      icon: 'category',             tone: 'secondary-soft', trend: 'Static', trendType: 'flat' },
];

// Display labels for each role (the User schema enum is user | admin | superadmin).
const ROLE_LABELS = { user: 'User', admin: 'Admin', superadmin: 'Superadmin' };

// Role hierarchy — a higher number outranks a lower one. Used to stop an admin
// from changing the status of an account that outranks them.
const ROLE_RANK = { user: 1, admin: 2, superadmin: 3 };

// Sidebar navigation. The first three keys map to data-backed views; the last
// two are catalogue sections shown for parity with the rest of the console.
const NAV_ITEMS = [
  { key: 'overview',   label: 'Overview',   icon: 'dashboard' },
  { key: 'users',      label: 'Accounts',   icon: 'group' },
  { key: 'orders',     label: 'Orders',     icon: 'receipt_long' },
  { key: 'vouchers',   label: 'Vouchers',   icon: 'confirmation_number' },
  { key: 'categories', label: 'Categories', icon: 'category' },
];

// Admin sub-pages are deep-linkable via a slug on the hash, e.g.
// "#admin/vouchers". A bare "#admin" (or an unknown slug) maps to the overview.
const TAB_KEYS = NAV_ITEMS.map((item) => item.key);

const tabFromHash = () => {
  const slug = window.location.hash.replace(/^#\/?/, '').split('/')[1] || 'overview';
  return TAB_KEYS.includes(slug) ? slug : 'overview';
};

// Title + subtitle shown in the page header for each view.
const PAGE_META = {
  overview:   { title: 'Overview',   subtitle: 'Real-time performance metrics and system health.' },
  users:      { title: 'Accounts',   subtitle: 'Manage user accounts, roles and access.' },
  orders:     { title: 'Orders',     subtitle: 'Every voucher redemption across all accounts.' },
  vouchers:   { title: 'Vouchers',   subtitle: 'The vouchers available across your catalogue.' },
  categories: { title: 'Categories', subtitle: 'The categories vouchers are grouped under.' },
};

// Rows shown in the Help modal — a short guide to each part of the console.
const HELP_ITEMS = [
  { icon: 'dashboard',           title: 'Overview',             text: 'Headline metrics, the most recent orders and your top-redeemed vouchers at a glance.' },
  { icon: 'group',               title: 'Accounts',             text: 'Activate or deactivate users. Superadmins can also change an account’s role.' },
  { icon: 'receipt_long',        title: 'Orders',               text: 'Every voucher redemption across all accounts. Download a receipt PDF for any order.' },
  { icon: 'confirmation_number', title: 'Vouchers & Categories', text: 'Create, edit and remove the vouchers in your catalogue and the categories they belong to.' },
  { icon: 'search',              title: 'Search',               text: 'Use the top search box to quickly find any account or order, then jump straight to it.' },
  { icon: 'dark_mode',           title: 'Theme',                text: 'Toggle light and dark mode with the moon / sun icon — your choice is remembered.' },
];

// Contact details shown in the Support modal. Kept in step with the customer
// Contact Us popup (components/contactus.jsx).
const SUPPORT_ITEMS = [
  { icon: 'mail',       label: 'Email support',    value: 'support@cartredeem.com', href: 'mailto:support@cartredeem.com?subject=Admin%20Console%20Support' },
  { icon: 'call',       label: 'Phone',            value: '+60-12-345-6789',        href: 'tel:+60123456789' },
  { icon: 'schedule',   label: 'Support hours',    value: 'Mon–Fri, 9am–6pm (MYT)' },
  { icon: 'bug_report', label: 'Report a problem', value: 'Open a ticket by email',  href: 'mailto:support@cartredeem.com?subject=Admin%20Console%20Issue' },
];

// Reusable centred empty state used by the overview panels and catalogue views.
const EmptyState = ({ icon, title, hint }) => (
  <div className="admin-empty">
    <span className="admin-empty__icon">
      <span className="material-symbols-outlined" aria-hidden="true">{icon}</span>
    </span>
    <p className="admin-empty__title">{title}</p>
    {hint && <p className="admin-empty__hint">{hint}</p>}
  </div>
);

/**
 * Admin dashboard. Loads statistics, users and orders from the protected
 * /api/admin endpoints and lets an admin activate / deactivate user accounts.
 *
 * @param {{ admin?: object, onLogout?: () => void }} props
 */
const AdminDashboard = ({ admin, onLogout }) => {
  const { isDark, toggle: toggleTheme } = useDarkMode();

  const [tab, setTab] = useState(tabFromHash);
  // Off-canvas sidebar visibility on narrow screens.
  const [navOpen, setNavOpen] = useState(false);

  const [stats, setStats]   = useState(null);   // full statistics payload
  const [users, setUsers]   = useState([]);
  const [orders, setOrders] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  // Tracks which user row currently has an activate/deactivate request in flight.
  const [pendingUserId, setPendingUserId] = useState(null);
  // Tracks which user row currently has a role-change request in flight.
  const [pendingRoleId, setPendingRoleId] = useState(null);
  // Tracks which order's receipt PDF is currently being downloaded.
  const [pendingPdfId, setPendingPdfId] = useState(null);

  // Topbar interactions: quick-find search, the profile menu and the help/support modals.
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen]   = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [helpOpen, setHelpOpen]       = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const searchRef  = useRef(null);
  const profileRef = useRef(null);

  // Close the search / profile dropdowns on an outside click, and dismiss any
  // open overlay (search, profile, help, support) with Escape.
  useEffect(() => {
    if (!searchOpen && !profileOpen && !helpOpen && !supportOpen) return undefined;

    const handlePointer = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setProfileOpen(false);
        setHelpOpen(false);
        setSupportOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [searchOpen, profileOpen, helpOpen, supportOpen]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [statsData, usersData, ordersData] = await Promise.all([
        getStatistics(),
        getAllUsers(),
        getAllOrders(),
      ]);
      setStats(statsData);
      setUsers(usersData);
      setOrders(ordersData);
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Flip a user's active flag, then patch it into local state so the table
  // reflects the change without a full reload.
  const handleToggleActive = async (user) => {
    setPendingUserId(user._id);
    setError('');
    try {
      const updated = user.is_active
        ? await deactivateUser(user._id)
        : await activateUser(user._id);
      setUsers((prev) =>
        prev.map((u) => (u._id === user._id ? { ...u, is_active: updated.is_active } : u))
      );
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setPendingUserId(null);
    }
  };

  // Promote/demote a user, then patch the new role into local state.
  const handleRoleChange = async (user, role) => {
    if (role === user.role) return;
    setPendingRoleId(user._id);
    setError('');
    try {
      const updated = await updateUserRole(user._id, role);
      setUsers((prev) =>
        prev.map((u) => (u._id === user._id ? { ...u, role: updated.role } : u))
      );
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setPendingRoleId(null);
    }
  };

  // Download (regenerate) an order's receipt PDF.
  const handleDownloadPDF = async (orderId) => {
    setPendingPdfId(orderId);
    setError('');
    try {
      await downloadOrderPDF(orderId);
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setPendingPdfId(null);
    }
  };

  const goTo = (key) => {
    setTab(key);
    setNavOpen(false);
    // Reflect the active sub-page in the URL so it's deep-linkable and the
    // browser back/forward buttons move between admin tabs.
    const target = `#admin/${key}`;
    if (window.location.hash !== target) window.location.hash = target;
  };

  // Keep the active tab in sync with the URL — handles deep links, manual hash
  // edits and the browser back/forward buttons. Also canonicalises a bare
  // "#admin" to "#admin/overview" (via replaceState, so no extra history entry).
  useEffect(() => {
    if (!window.location.hash.replace(/^#\/?/, '').includes('/')) {
      window.history.replaceState(null, '', `#admin/${tabFromHash()}`);
    }
    const onHashChange = () => setTab(tabFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Quick-find across the already-loaded accounts and orders. Returns the two
  // groups separately so the dropdown can label them; each is capped to keep
  // the menu short.
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return { users: [], orders: [], total: 0 };

    const matchedUsers = users
      .filter(
        (u) =>
          (u.username || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q)
      )
      .slice(0, 6)
      .map((u) => ({
        id: `user-${u._id}`,
        tab: 'users',
        icon: 'person',
        title: u.username || u.email || 'User',
        subtitle: u.email || '—',
        tag: 'Account',
      }));

    const matchedOrders = orders
      .filter((o) => {
        const title = (o.voucher_id?.title || o.voucher_title || '').toLowerCase();
        const who = (o.user_id?.username || '').toLowerCase();
        return title.includes(q) || who.includes(q);
      })
      .slice(0, 6)
      .map((o) => ({
        id: `order-${o._id}`,
        tab: 'orders',
        icon: 'receipt_long',
        title: o.voucher_id?.title || o.voucher_title || 'Voucher',
        subtitle: `${o.user_id?.username || 'Unknown user'} · ${formatDate(o.order_date)}`,
        tag: 'Order',
      }));

    return {
      users: matchedUsers,
      orders: matchedOrders,
      total: matchedUsers.length + matchedOrders.length,
    };
  }, [searchQuery, users, orders]);

  // Jump to the section a search hit belongs to, then clear and close the menu.
  const handleSearchSelect = (result) => {
    goTo(result.tab);
    setSearchQuery('');
    setSearchOpen(false);
  };

  const statistics   = stats?.statistics ?? {};
  const recentOrders = stats?.recentOrders ?? [];
  const topVouchers  = stats?.topVouchers ?? [];

  // Only a superadmin may change account roles — regular admins see roles as
  // read-only labels.
  const canManageRoles = admin?.role === 'superadmin';

  // Account-page metrics, all derived from the loaded users (no extra API).
  // Drives the stats bar and the Role Distribution card on the Accounts tab.
  const accountMetrics = useMemo(() => {
    const now = new Date();
    const roles = { superadmin: 0, admin: 0, user: 0 };
    let active = 0;
    let totalPoints = 0;
    let newThisMonth = 0;

    for (const u of users) {
      if (u.is_active) active += 1;
      totalPoints += Number(u.points || 0);
      roles[u.role] = (roles[u.role] || 0) + 1;
      const joined = new Date(u.createdAt);
      if (
        !Number.isNaN(joined.getTime()) &&
        joined.getFullYear() === now.getFullYear() &&
        joined.getMonth() === now.getMonth()
      ) {
        newThisMonth += 1;
      }
    }

    return { total: users.length, active, totalPoints, newThisMonth, roles };
  }, [users]);

  // Four computed cards shown above the accounts table (mockup's stats bar).
  const accountStatCards = [
    { label: 'Total Accounts',  value: formatNumber(accountMetrics.total) },
    { label: 'Active Accounts', value: formatNumber(accountMetrics.active), sub: `of ${formatNumber(accountMetrics.total)}` },
    { label: 'New This Month',  value: formatNumber(accountMetrics.newThisMonth) },
    { label: 'Point Liability', value: formatCompact(accountMetrics.totalPoints), suffix: 'PTS' },
  ];

  // Role breakdown for the distribution card (tone selects the dot colour).
  const roleDistribution = [
    { key: 'superadmin', label: 'Superadmins',    tone: 'primary',   count: accountMetrics.roles.superadmin || 0 },
    { key: 'admin',      label: 'Admins',         tone: 'secondary', count: accountMetrics.roles.admin || 0 },
    { key: 'user',       label: 'Standard Users', tone: 'neutral',   count: accountMetrics.roles.user || 0 },
  ];

  const adminName = admin?.username || admin?.email || 'Admin';
  const adminEmail = admin?.email || '—';
  const adminRole = admin?.role || 'admin';
  const adminInitial = adminName.charAt(0).toUpperCase();
  const page = PAGE_META[tab] || PAGE_META.overview;

  return (
    <div className={`admin-layout${navOpen ? ' admin-layout--nav-open' : ''}`}>
      {/* Backdrop shown behind the off-canvas sidebar on mobile */}
      <div
        className="admin-backdrop"
        onClick={() => setNavOpen(false)}
        aria-hidden="true"
      />

      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-brand__logo">
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1" }}
              aria-hidden="true"
            >
              confirmation_number
            </span>
          </span>
          <div>
            <p className="admin-brand__name">CartRedeem</p>
            <p className="admin-brand__sub">Admin Console</p>
          </div>
        </div>

        <nav className="admin-nav" aria-label="Dashboard sections">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`admin-nav__item${tab === item.key ? ' admin-nav__item--active' : ''}`}
              onClick={() => goTo(item.key)}
            >
              <span className="material-symbols-outlined" aria-hidden="true">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="admin-sidebar__footer">
          <button
            type="button"
            className="admin-nav__item"
            onClick={() => { setSupportOpen(true); setNavOpen(false); }}
          >
            <span className="material-symbols-outlined" aria-hidden="true">contact_support</span>
            Support
          </button>
        </div>
      </aside>

      {/* ── Main column ──────────────────────────────────────────────── */}
      <div className="admin-content">
        <header className="admin-topbar">
          <div className="admin-topbar__left">
            <button
              type="button"
              className="admin-icon-btn admin-menu-btn"
              onClick={() => setNavOpen((v) => !v)}
              aria-label="Toggle navigation"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <span className="admin-topbar__brand">CartRedeem</span>
            <span className="admin-topbar__divider" aria-hidden="true" />
            <span className="admin-topbar__crumb">Admin Dashboard</span>
          </div>

          <div className="admin-topbar__right">
            <div className="admin-search-wrap" ref={searchRef}>
              <div className="admin-search">
                <span className="material-symbols-outlined" aria-hidden="true">search</span>
                <input
                  type="text"
                  placeholder="Search accounts & orders…"
                  aria-label="Search accounts and orders"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSearchOpen(true);
                  }}
                  onFocus={() => setSearchOpen(true)}
                />
              </div>

              {searchOpen && searchQuery.trim() && (
                <div className="admin-search-menu" role="listbox">
                  {searchResults.total === 0 ? (
                    <p className="admin-search-menu__empty">
                      No matches for “{searchQuery.trim()}”.
                    </p>
                  ) : (
                    [
                      { key: 'users', label: 'Accounts', items: searchResults.users },
                      { key: 'orders', label: 'Orders', items: searchResults.orders },
                    ]
                      .filter((group) => group.items.length > 0)
                      .map((group) => (
                        <div className="admin-search-group" key={group.key}>
                          <p className="admin-search-group__label">{group.label}</p>
                          {group.items.map((result) => (
                            <button
                              type="button"
                              className="admin-search-result"
                              key={result.id}
                              onClick={() => handleSearchSelect(result)}
                            >
                              <span className="admin-search-result__icon material-symbols-outlined" aria-hidden="true">
                                {result.icon}
                              </span>
                              <span className="admin-search-result__text">
                                <span className="admin-search-result__title">{result.title}</span>
                                <span className="admin-search-result__sub">{result.subtitle}</span>
                              </span>
                              <span className="admin-search-result__tag">{result.tag}</span>
                            </button>
                          ))}
                        </div>
                      ))
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              className="admin-icon-btn"
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <span className="material-symbols-outlined">{isDark ? 'light_mode' : 'dark_mode'}</span>
            </button>
            <button
              type="button"
              className="admin-icon-btn"
              onClick={() => setHelpOpen(true)}
              aria-label="Help"
            >
              <span className="material-symbols-outlined">help</span>
            </button>

            <div className="admin-user" ref={profileRef}>
              <button
                type="button"
                className="admin-user__trigger"
                onClick={() => setProfileOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={profileOpen}
                aria-label="Account menu"
              >
                <span className="admin-user__meta">
                  <span className="admin-user__name">{adminName}</span>
                  <span className="admin-user__role">{ROLE_LABELS[adminRole] || 'Admin'}</span>
                </span>
                <span className="admin-user__avatar" aria-hidden="true">{adminInitial}</span>
                <span className="admin-user__chevron material-symbols-outlined" aria-hidden="true">
                  {profileOpen ? 'expand_less' : 'expand_more'}
                </span>
              </button>

              {profileOpen && (
                <div className="admin-profile-menu" role="menu">
                  <div className="admin-profile-menu__head">
                    <span className="admin-user__avatar admin-user__avatar--lg" aria-hidden="true">
                      {adminInitial}
                    </span>
                    <div className="admin-profile-menu__id">
                      <p className="admin-profile-menu__name">{adminName}</p>
                      <p className="admin-profile-menu__email">{adminEmail}</p>
                    </div>
                  </div>
                  <div className="admin-profile-menu__row">
                    <span className="admin-profile-menu__rowlabel">Role</span>
                    <span className={`admin-role-badge admin-role-badge--${adminRole}`}>
                      {ROLE_LABELS[adminRole] || adminRole}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="admin-profile-menu__item"
                    role="menuitem"
                    onClick={() => {
                      setProfileOpen(false);
                      onLogout?.();
                    }}
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">logout</span>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="admin-main">
          {/* Page header — Orders, Vouchers and Categories render their own. */}
          {tab !== 'orders' && tab !== 'vouchers' && tab !== 'categories' && (
            <div className="admin-page-head">
              <div>
                <h1 className="admin-page-head__title">{page.title}</h1>
                <p className="admin-page-head__subtitle">{page.subtitle}</p>
              </div>
              <button
                type="button"
                className="admin-refresh"
                onClick={loadAll}
                disabled={loading}
                title="Reload data"
              >
                <span className="material-symbols-outlined" aria-hidden="true">refresh</span>
                {loading ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          )}

          {error && (
            <p className="admin-error" role="alert">
              <span className="material-symbols-outlined" aria-hidden="true">error</span>
              {error}
            </p>
          )}

          {loading && !stats ? (
            <div className="admin-loading">
              <span className="material-symbols-outlined admin-loading__spin" aria-hidden="true">
                progress_activity
              </span>
              Loading dashboard…
            </div>
          ) : (
            <>
              {/* ── Overview ─────────────────────────────────────────── */}
              {tab === 'overview' && (
                <section className="admin-section">
                  <div className="admin-stats">
                    {STAT_CARDS.map((card) => (
                      <div className="admin-stat-card" key={card.key}>
                        <div className="admin-stat-card__top">
                          <span className={`admin-stat-card__icon admin-stat-card__icon--${card.tone}`}>
                            <span
                              className="material-symbols-outlined"
                              style={{ fontVariationSettings: "'FILL' 1" }}
                              aria-hidden="true"
                            >
                              {card.icon}
                            </span>
                          </span>
                          <span className={`admin-trend admin-trend--${card.trendType}`}>{card.trend}</span>
                        </div>
                        <div>
                          <p className="admin-stat-card__label">{card.label}</p>
                          <p className="admin-stat-card__value">{formatNumber(statistics[card.key])}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="admin-panels">
                    {/* Recent orders */}
                    <div className="admin-panel">
                      <div className="admin-panel__head">
                        <h2 className="admin-panel__title">Recent Orders</h2>
                        <button type="button" className="admin-panel__link" onClick={() => goTo('orders')}>
                          View All
                        </button>
                      </div>

                      {recentOrders.length === 0 ? (
                        <EmptyState
                          icon="inbox"
                          title="No orders yet."
                          hint="New orders will appear here as customers redeem vouchers."
                        />
                      ) : (
                        <ul className="admin-feed">
                          {recentOrders.map((order) => (
                            <li className="admin-feed__row" key={order._id}>
                              <div className="admin-feed__main">
                                <span className="admin-feed__title">
                                  {order.voucher_id?.title || order.voucher_title || 'Voucher'}
                                </span>
                                <span className="admin-feed__meta">
                                  {order.user_id?.username || 'Unknown user'} · {formatDate(order.order_date)}
                                </span>
                              </div>
                              <span className="admin-feed__value">
                                −{formatNumber(order.points_deducted)} pts
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Top vouchers */}
                    <div className="admin-panel">
                      <div className="admin-panel__head">
                        <h2 className="admin-panel__title">Top Redeemed Vouchers</h2>
                        <span className="admin-panel__badge">This Month</span>
                      </div>

                      {topVouchers.length === 0 ? (
                        <EmptyState
                          icon="redeem"
                          title="No redemptions yet."
                          hint="Once vouchers are used, they will be ranked by popularity here."
                        />
                      ) : (
                        <ul className="admin-feed">
                          {topVouchers.map((entry, index) => (
                            <li className="admin-feed__row" key={entry._id || index}>
                              <div className="admin-feed__main">
                                <span className="admin-feed__rank">{index + 1}</span>
                                <div>
                                  <span className="admin-feed__title">
                                    {entry.voucherDetails?.[0]?.title || 'Voucher'}
                                  </span>
                                  <span className="admin-feed__meta">
                                    {formatNumber(entry.totalPoints)} pts redeemed
                                  </span>
                                </div>
                              </div>
                              <span className="admin-feed__value">{formatNumber(entry.count)}×</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {/* ── Accounts ─────────────────────────────────────────── */}
              {tab === 'users' && (
                <section className="admin-section">
                  {/* Computed stats bar (derived from the loaded accounts) */}
                  <div className="admin-stats">
                    {accountStatCards.map((card) => (
                      <div className="admin-stat-card" key={card.label}>
                        <p className="admin-stat-card__label admin-stat-card__label--upper">
                          {card.label}
                        </p>
                        <div className="admin-stat-card__figure">
                          <span className="admin-stat-card__value">{card.value}</span>
                          {card.suffix && (
                            <span className="admin-stat-card__suffix">{card.suffix}</span>
                          )}
                          {card.sub && (
                            <span className="admin-stat-card__sub">{card.sub}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="admin-panel">
                    <div className="admin-panel__head">
                      <h2 className="admin-panel__title">
                        Accounts <span className="admin-pill">{users.length} Total</span>
                      </h2>
                    </div>

                    {users.length === 0 ? (
                      <EmptyState icon="group_off" title="No accounts found." />
                    ) : (
                      <div className="admin-table-wrap">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>User</th>
                              <th>Email</th>
                              <th className="admin-table__num">Points</th>
                              <th>Role</th>
                              <th>Status</th>
                              <th>Joined</th>
                              <th className="admin-table__action">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {users.map((user) => {
                              // The signed-in admin can't change their own role or
                              // status (prevents accidental self-lockout).
                              const isSelf = String(user._id) === String(admin?.id);
                              // …nor manage an account that outranks them.
                              const outranksMe =
                                (ROLE_RANK[user.role] || 0) > (ROLE_RANK[admin?.role] || 0);

                              return (
                                <tr key={user._id}>
                                  <td data-label="User">
                                    <div className="admin-table__user">
                                      <span
                                        className={`admin-avatar admin-avatar--${user.role}`}
                                        aria-hidden="true"
                                      >
                                        {(user.username || '?').charAt(0).toUpperCase()}
                                      </span>
                                      <span className="admin-table__username">{user.username}</span>
                                    </div>
                                  </td>
                                  <td data-label="Email">{user.email}</td>
                                  <td data-label="Points" className="admin-table__num">
                                    <span
                                      className={`admin-points${user.points > 0 ? '' : ' admin-points--zero'}`}
                                    >
                                      {formatNumber(user.points)}
                                    </span>
                                  </td>
                                  <td data-label="Role">
                                    {canManageRoles ? (
                                      <select
                                        className="admin-role-select"
                                        value={user.role}
                                        onChange={(e) => handleRoleChange(user, e.target.value)}
                                        disabled={isSelf || pendingRoleId === user._id}
                                        title={isSelf ? "You can't change your own role" : 'Change role'}
                                      >
                                        <option value="user">User</option>
                                        <option value="admin">Admin</option>
                                        <option value="superadmin">Superadmin</option>
                                      </select>
                                    ) : (
                                      <span className={`admin-role-badge admin-role-badge--${user.role}`}>
                                        {ROLE_LABELS[user.role] || user.role}
                                      </span>
                                    )}
                                  </td>
                                  <td data-label="Status">
                                    <span
                                      className={`admin-status admin-status--${user.is_active ? 'active' : 'inactive'}`}
                                    >
                                      {user.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                  </td>
                                  <td data-label="Joined">{formatDate(user.createdAt)}</td>
                                  <td data-label="Action" className="admin-table__action">
                                    <button
                                      type="button"
                                      className={`admin-btn admin-btn--${user.is_active ? 'danger' : 'success'}`}
                                      onClick={() => handleToggleActive(user)}
                                      disabled={isSelf || outranksMe || pendingUserId === user._id}
                                      title={
                                        isSelf
                                          ? "You can't change your own status"
                                          : outranksMe
                                          ? "You can't change an account with a higher role"
                                          : undefined
                                      }
                                    >
                                      {pendingUserId === user._id
                                        ? '…'
                                        : user.is_active
                                        ? 'Deactivate'
                                        : 'Activate'}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Role distribution (computed client-side from the accounts) */}
                  {users.length > 0 && (
                    <div className="admin-panel admin-accounts__dist">
                      <div className="admin-panel__head">
                        <h2 className="admin-panel__title">Role Distribution</h2>
                      </div>
                      <div className="admin-dist">
                        {roleDistribution.map((entry) => (
                          <div className="admin-dist__item" key={entry.key}>
                            <span className={`admin-dist__dot admin-dist__dot--${entry.tone}`} aria-hidden="true" />
                            <span className="admin-dist__text">
                              <span className="admin-dist__label">{entry.label}</span>
                              <span className="admin-dist__count">{formatNumber(entry.count)}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* ── Orders ───────────────────────────────────────────── */}
              {tab === 'orders' && (
                <AdminOrder
                  orders={orders}
                  loading={loading}
                  pendingPdfId={pendingPdfId}
                  onRefresh={loadAll}
                  onDownloadPDF={handleDownloadPDF}
                  onViewAnalytics={() => goTo('overview')}
                />
              )}

              {/* ── Vouchers / Categories (full CRUD management) ─────── */}
              {tab === 'vouchers' && <AdminVouchers />}

              {tab === 'categories' && <AdminCategories />}
            </>
          )}
        </main>
      </div>

      {/* ── Help modal ───────────────────────────────────────────────── */}
      {helpOpen && (
        <div className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="admin-help-title">
          <div className="admin-modal__backdrop" onClick={() => setHelpOpen(false)} aria-hidden="true" />
          <div className="admin-modal__card">
            <div className="admin-modal__head">
              <div className="admin-modal__head-main">
                <span className="admin-modal__head-icon material-symbols-outlined" aria-hidden="true">help</span>
                <div>
                  <h2 id="admin-help-title" className="admin-modal__title">Help &amp; Tips</h2>
                  <p className="admin-modal__subtitle">A quick guide to the admin console.</p>
                </div>
              </div>
              <button
                type="button"
                className="admin-icon-btn"
                onClick={() => setHelpOpen(false)}
                aria-label="Close help"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="admin-modal__body">
              <ul className="admin-help-list">
                {HELP_ITEMS.map((item) => (
                  <li className="admin-help-item" key={item.title}>
                    <span className="admin-help-item__icon material-symbols-outlined" aria-hidden="true">
                      {item.icon}
                    </span>
                    <div>
                      <p className="admin-help-item__title">{item.title}</p>
                      <p className="admin-help-item__text">{item.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ── Support modal ────────────────────────────────────────────── */}
      {supportOpen && (
        <div className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="admin-support-title">
          <div className="admin-modal__backdrop" onClick={() => setSupportOpen(false)} aria-hidden="true" />
          <div className="admin-modal__card">
            <div className="admin-modal__head">
              <div className="admin-modal__head-main">
                <span className="admin-modal__head-icon material-symbols-outlined" aria-hidden="true">contact_support</span>
                <div>
                  <h2 id="admin-support-title" className="admin-modal__title">Support</h2>
                  <p className="admin-modal__subtitle">Need a hand? Here’s how to reach us.</p>
                </div>
              </div>
              <button
                type="button"
                className="admin-icon-btn"
                onClick={() => setSupportOpen(false)}
                aria-label="Close support"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="admin-modal__body">
              <ul className="admin-support-list">
                {SUPPORT_ITEMS.map((item) => (
                  <li className="admin-support-item" key={item.label}>
                    <span className="admin-support-item__icon material-symbols-outlined" aria-hidden="true">
                      {item.icon}
                    </span>
                    <div className="admin-support-item__text">
                      <span className="admin-support-item__label">{item.label}</span>
                      {item.href ? (
                        <a className="admin-support-item__value" href={item.href}>{item.value}</a>
                      ) : (
                        <span className="admin-support-item__value">{item.value}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
