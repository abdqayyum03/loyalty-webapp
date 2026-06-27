import { useEffect, useMemo, useState } from 'react';

/**
 * Admin → Orders.
 *
 * A focused view over every voucher redemption (CartItemHistory). It is purely
 * presentational: the parent dashboard owns the data fetch + the receipt-PDF
 * download, and passes them in. Search, status filtering, CSV export, the
 * trend chart and the "Top Vouchers" ranking are all derived client-side from
 * the orders array, so the page stays in sync with whatever the API returns.
 *
 * @param {{
 *   orders: object[],
 *   loading?: boolean,
 *   pendingPdfId?: string|null,
 *   onRefresh?: () => void,
 *   onDownloadPDF?: (orderId: string) => void,
 *   onViewAnalytics?: () => void,
 * }} props
 */

const PAGE_SIZE = 8;

const formatNumber = (n) => Number(n || 0).toLocaleString();

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-MY', { year: 'numeric', month: 'short', day: 'numeric' });
};

// Canonical order reference, shared with the PDF receipt. Prefers the persisted
// `order_number`; for legacy records without it, recompute the *identical*
// value the backend would (last 8 of the _id) so the admin table and the PDF
// always agree.
const orderRef = (order) =>
  order?.order_number || `ORD-${String(order?._id || '').slice(-8).toUpperCase()}`;

// Two-letter initials for the customer avatar (john_doe → "JD", afham → "AF").
const initials = (name = '') => {
  const parts = String(name).split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return String(name).slice(0, 2).toUpperCase() || '?';
};

// The redemption model records only *completed* redemptions — points are
// deducted atomically at checkout, so there is no pending/processing workflow.
// Every order therefore resolves to "completed". This is the single place to
// extend if a real order lifecycle is ever added to the backend.
const deriveStatus = () => 'completed';

const STATUS_LABELS = {
  completed: 'Completed',
  pending: 'Pending',
  processing: 'Processing',
};

const voucherTitle = (o) => o.voucher_id?.title || o.voucher_title || 'Voucher';

// Centred empty state (mirrors the dashboard's shared one).
const EmptyState = ({ icon, title, hint }) => (
  <div className="admin-empty">
    <span className="admin-empty__icon">
      <span className="material-symbols-outlined" aria-hidden="true">{icon}</span>
    </span>
    <p className="admin-empty__title">{title}</p>
    {hint && <p className="admin-empty__hint">{hint}</p>}
  </div>
);

const AdminOrder = ({
  orders = [],
  loading = false,
  pendingPdfId = null,
  onRefresh,
  onDownloadPDF,
  onViewAnalytics,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  // ── Headline metrics (all computed from the loaded orders) ──────────
  const metrics = useMemo(() => {
    const today = new Date();
    const sameDay = (d) => {
      const x = new Date(d);
      return (
        x.getFullYear() === today.getFullYear() &&
        x.getMonth() === today.getMonth() &&
        x.getDate() === today.getDate()
      );
    };

    let pending = 0;
    let completedToday = 0;
    let totalPoints = 0;

    for (const o of orders) {
      const status = deriveStatus(o);
      if (status === 'pending' || status === 'processing') pending += 1;
      if (status === 'completed' && sameDay(o.order_date)) completedToday += 1;
      totalPoints += Number(o.points_deducted || 0);
    }

    return {
      total: orders.length,
      pending,
      completedToday,
      avg: orders.length ? Math.round(totalPoints / orders.length) : 0,
    };
  }, [orders]);

  // ── Last-7-days redemption trend (drives the bar chart + the blurb) ─
  const trends = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6); // first of the seven days

    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return { date: d, count: 0, label: d.toLocaleDateString('en-MY', { weekday: 'narrow' }) };
    });

    const startMs = start.getTime();
    let curr = 0;
    let prev = 0; // the seven days *before* the window, for the comparison

    for (const o of orders) {
      const t = new Date(o.order_date);
      t.setHours(0, 0, 0, 0);
      const idx = Math.round((t.getTime() - startMs) / 86_400_000);
      if (idx >= 0 && idx <= 6) {
        days[idx].count += 1;
        curr += 1;
      } else if (idx < 0 && idx >= -7) {
        prev += 1;
      }
    }

    const max = Math.max(1, ...days.map((d) => d.count));
    const delta = prev > 0 ? Math.round(((curr - prev) / prev) * 100) : curr > 0 ? 100 : 0;
    return { days, max, curr, delta };
  }, [orders]);

  // ── Top vouchers by redemption count ────────────────────────────────
  const topVouchers = useMemo(() => {
    const counts = new Map();
    for (const o of orders) {
      const title = voucherTitle(o);
      counts.set(title, (counts.get(title) || 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([title, count]) => ({ title, count }));
  }, [orders]);

  // ── Search + status filtering ───────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== 'all' && deriveStatus(o) !== statusFilter) return false;
      if (!q) return true;
      const haystack = [
        orderRef(o),
        o.user_id?.username,
        o.user_id?.email,
        voucherTitle(o),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [orders, search, statusFilter]);

  // Whenever the result set changes, snap back to the first page.
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, orders]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(startIndex, startIndex + PAGE_SIZE);
  const rangeStart = filtered.length ? startIndex + 1 : 0;
  const rangeEnd = Math.min(startIndex + PAGE_SIZE, filtered.length);

  // Compact page list with ellipses, e.g. 1 … 4 5 6 … 312.
  const pageList = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = [1];
    if (currentPage > 3) pages.push('…');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push('…');
    pages.push(totalPages);
    return pages;
  }, [currentPage, totalPages]);

  // ── Export the (filtered) orders as a CSV download ──────────────────
  const handleExportCSV = () => {
    const header = ['Order ID', 'Customer', 'Email', 'Voucher', 'Amount (Pts)', 'Status', 'Date'];
    const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = filtered.map((o) =>
      [
        orderRef(o),
        o.user_id?.username || 'Unknown',
        o.user_id?.email || '',
        voucherTitle(o),
        o.points_deducted ?? 0,
        STATUS_LABELS[deriveStatus(o)],
        formatDate(o.order_date),
      ]
        .map(escape)
        .join(',')
    );

    const csv = [header.map(escape).join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const hasFilters = search.trim() !== '' || statusFilter !== 'all';

  const statCards = [
    {
      key: 'total',
      label: 'Total Redemptions',
      value: formatNumber(metrics.total),
      icon: 'trending_up',
      tone: 'primary-soft',
      trend: `${trends.delta >= 0 ? '+' : ''}${trends.delta}%`,
      trendType: trends.delta > 0 ? 'up' : trends.delta < 0 ? 'down' : 'flat',
    },
    {
      key: 'pending',
      label: 'Pending Orders',
      value: formatNumber(metrics.pending),
      icon: 'more_horiz',
      tone: 'secondary-soft',
    },
    {
      key: 'today',
      label: 'Completed Today',
      value: formatNumber(metrics.completedToday),
      icon: 'task_alt',
      tone: 'tertiary-soft',
    },
    {
      key: 'avg',
      label: 'Avg. Order Value',
      value: formatNumber(metrics.avg),
      suffix: 'Pts',
      icon: 'payments',
      tone: 'primary-soft',
    },
  ];

  return (
    <section className="admin-section">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="admin-page-head admin-orders-head">
        <div>
          <h1 className="admin-page-head__title admin-orders-title">
            Orders
            <span className="admin-pill">{formatNumber(metrics.total)} Total</span>
          </h1>
          <p className="admin-page-head__subtitle">
            Manage and monitor all voucher redemptions in real-time.
          </p>
        </div>

        <div className="admin-orders-head__actions">
          <button
            type="button"
            className="admin-refresh"
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
          >
            <span className="material-symbols-outlined" aria-hidden="true">filter_list</span>
            Filter
          </button>
          <button
            type="button"
            className="admin-refresh"
            onClick={handleExportCSV}
            disabled={filtered.length === 0}
            title="Download the current orders as CSV"
          >
            <span className="material-symbols-outlined" aria-hidden="true">download</span>
            Export CSV
          </button>
          <button
            type="button"
            className="admin-refresh"
            onClick={() => onRefresh?.()}
            disabled={loading}
            title="Reload data"
          >
            <span className="material-symbols-outlined" aria-hidden="true">refresh</span>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────── */}
      <div className="admin-stats">
        {statCards.map((card) => (
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
              {card.trend && (
                <span className={`admin-trend admin-trend--${card.trendType}`}>{card.trend}</span>
              )}
            </div>
            <div>
              <p className="admin-stat-card__label admin-stat-card__label--upper">{card.label}</p>
              <div className="admin-stat-card__figure">
                <span className="admin-stat-card__value">{card.value}</span>
                {card.suffix && <span className="admin-stat-card__suffix">{card.suffix}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filter bar (toggled by the Filter button) ───────────────── */}
      {showFilters && (
        <div className="admin-filters">
          <div className="admin-filters__search">
            <span className="material-symbols-outlined" aria-hidden="true">search</span>
            <input
              type="text"
              placeholder="Search by order, customer or voucher…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search orders"
            />
          </div>
          <select
            className="admin-role-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
          </select>
          {hasFilters && (
            <button
              type="button"
              className="admin-panel__link"
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
              }}
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* ── Orders table ────────────────────────────────────────────── */}
      <div className="admin-panel">
        {filtered.length === 0 ? (
          <EmptyState
            icon={orders.length === 0 ? 'inbox' : 'search_off'}
            title={orders.length === 0 ? 'No orders yet.' : 'No orders match your filters.'}
            hint={
              orders.length === 0
                ? 'New orders will appear here as customers redeem vouchers.'
                : 'Try a different search term or status.'
            }
          />
        ) : (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table admin-orders-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Voucher</th>
                    <th className="admin-table__num">Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th className="admin-table__action">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((o) => {
                    const status = deriveStatus(o);
                    const customer = o.user_id?.username || 'Unknown';
                    return (
                      <tr key={o._id}>
                        <td data-label="Order ID">
                          <span className="admin-order-id">#{orderRef(o)}</span>
                        </td>
                        <td data-label="Customer">
                          <div className="admin-table__user">
                            <span className="admin-avatar" aria-hidden="true">{initials(customer)}</span>
                            <span className="admin-table__username">{customer}</span>
                          </div>
                        </td>
                        <td data-label="Voucher">{voucherTitle(o)}</td>
                        <td data-label="Amount" className="admin-table__num">
                          <span className="admin-order-amount">{formatNumber(o.points_deducted)} Pts</span>
                        </td>
                        <td data-label="Status">
                          <span className={`admin-order-status admin-order-status--${status}`}>
                            {STATUS_LABELS[status]}
                          </span>
                        </td>
                        <td data-label="Date">{formatDate(o.order_date)}</td>
                        <td data-label="Actions" className="admin-table__action">
                          <button
                            type="button"
                            className="admin-icon-action"
                            onClick={() => onDownloadPDF?.(o._id)}
                            disabled={pendingPdfId === o._id}
                            title="Download receipt PDF"
                            aria-label="Download receipt PDF"
                          >
                            <span className="material-symbols-outlined" aria-hidden="true">
                              {pendingPdfId === o._id ? 'progress_activity' : 'download'}
                            </span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="admin-pagination">
              <p className="admin-pagination__info">
                Showing {formatNumber(rangeStart)} to {formatNumber(rangeEnd)} of{' '}
                {formatNumber(filtered.length)} orders
              </p>
              <div className="admin-pagination__pages">
                <button
                  type="button"
                  className="admin-page-btn"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">chevron_left</span>
                </button>
                {pageList.map((p, i) =>
                  p === '…' ? (
                    <span className="admin-page-ellipsis" key={`gap-${i}`} aria-hidden="true">…</span>
                  ) : (
                    <button
                      type="button"
                      key={p}
                      className={`admin-page-btn${p === currentPage ? ' admin-page-btn--active' : ''}`}
                      onClick={() => setPage(p)}
                      aria-current={p === currentPage ? 'page' : undefined}
                    >
                      {p}
                    </button>
                  )
                )}
                <button
                  type="button"
                  className="admin-page-btn"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  aria-label="Next page"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">chevron_right</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Trends + Top vouchers ───────────────────────────────────── */}
      <div className="admin-panels admin-orders-panels">
        <div className="admin-panel">
          <div className="admin-panel__head">
            <h2 className="admin-panel__title">Redemption Trends</h2>
            {onViewAnalytics && (
              <button type="button" className="admin-panel__link" onClick={onViewAnalytics}>
                View detailed analytics →
              </button>
            )}
          </div>
          <div className="admin-trends">
            <p className="admin-trends__text">
              {trends.curr > 0 ? (
                <>
                  Your redemptions are {trends.delta >= 0 ? 'up' : 'down'}{' '}
                  <strong>{Math.abs(trends.delta)}%</strong> over the last 7 days compared to the
                  previous week.
                </>
              ) : (
                'No redemptions in the last 7 days yet — new activity will show up here.'
              )}
            </p>
            <div
              className="admin-chart"
              role="img"
              aria-label="Redemptions per day over the last 7 days"
            >
              {trends.days.map((d, i) => (
                <div className="admin-chart__col" key={i}>
                  <div
                    className={`admin-chart__bar${
                      d.count === trends.max && d.count > 0 ? ' admin-chart__bar--peak' : ''
                    }`}
                    style={{ height: `${6 + (d.count / trends.max) * 84}%` }}
                    title={`${d.count} on ${formatDate(d.date)}`}
                  />
                  <span className="admin-chart__label">{d.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="admin-panel">
          <div className="admin-panel__head">
            <h2 className="admin-panel__title">Top Vouchers</h2>
            <span className="admin-panel__badge">All time</span>
          </div>
          {topVouchers.length === 0 ? (
            <EmptyState icon="redeem" title="No redemptions yet." />
          ) : (
            <ul className="admin-feed">
              {topVouchers.map((v, i) => (
                <li className="admin-feed__row" key={v.title}>
                  <div className="admin-feed__main">
                    <span className="admin-feed__rank">{i + 1}</span>
                    <span className="admin-feed__title">{v.title}</span>
                  </div>
                  <span className="admin-feed__value">{formatNumber(v.count)} redemptions</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
};

export default AdminOrder;
