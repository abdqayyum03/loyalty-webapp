import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getAllVouchers,
  getAllCategories,
  createVoucher,
  updateVoucher,
  deleteVoucher,
  getAdminErrorMessage,
} from '../../api/admin';
import AdminVoucherForm from './AdminVoucherForm';

/**
 * Admin → Vouchers.
 *
 * Full management view for the voucher catalogue (the mockup's list screen):
 * headline stats, search + filtering, a paginated table and create / edit /
 * delete actions. Unlike the Orders view this component is self-contained — it
 * owns its data fetch and the voucher CRUD calls, so it can be dropped straight
 * into the dashboard's "Vouchers" tab.
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

// Whether a voucher is currently valid (active + not past its expiry date).
// Uses the backend's computed `is_valid` virtual when present, otherwise
// derives it locally so the column still works without it.
const isVoucherValid = (v) => {
  if (typeof v.is_valid === 'boolean') return v.is_valid;
  if (v.is_active === false) return false;
  if (!v.valid_until) return true;
  const date = new Date(v.valid_until);
  return Number.isNaN(date.getTime()) ? true : date.getTime() >= Date.now();
};

// Pick a representative icon from the voucher's category name (falls back to a
// generic ticket). Keyword match keeps it working for new categories too.
const ICON_BY_KEYWORD = [
  [/food|drink|beverage|restaurant|cafe|dining/i, 'restaurant'],
  [/shop|retail|store|mall|grocery/i, 'shopping_bag'],
  [/travel|flight|hotel|holiday|trip/i, 'flight'],
  [/electronic|tech|gadget|device/i, 'devices'],
  [/fashion|cloth|apparel|wear/i, 'checkroom'],
  [/beauty|health|spa|wellness/i, 'spa'],
  [/entertain|movie|game|fun/i, 'sports_esports'],
];

const categoryName = (voucher) =>
  voucher.category_id?.name || voucher.category?.name || 'Uncategorized';

const voucherIcon = (voucher) => {
  const name = categoryName(voucher);
  const match = ICON_BY_KEYWORD.find(([re]) => re.test(name));
  return match ? match[1] : 'confirmation_number';
};

const EmptyState = ({ icon, title, hint, action }) => (
  <div className="admin-empty">
    <span className="admin-empty__icon">
      <span className="material-symbols-outlined" aria-hidden="true">{icon}</span>
    </span>
    <p className="admin-empty__title">{title}</p>
    {hint && <p className="admin-empty__hint">{hint}</p>}
    {action}
  </div>
);

const AdminVouchers = () => {
  const [vouchers, setVouchers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | active | inactive
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  // Create / edit modal.
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null); // voucher being edited, or null
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete confirmation.
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [voucherData, categoryData] = await Promise.all([
        getAllVouchers(),
        getAllCategories(),
      ]);
      setVouchers(voucherData);
      setCategories(categoryData);
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ── Headline metrics (all derived from the loaded vouchers) ─────────
  const metrics = useMemo(() => {
    let active = 0;
    let totalPoints = 0;
    let totalStock = 0;
    for (const v of vouchers) {
      if (v.is_active) active += 1;
      totalPoints += Number(v.points || 0);
      totalStock += Number(v.quantity_available || 0);
    }
    return {
      total: vouchers.length,
      active,
      inactive: vouchers.length - active,
      avgPoints: vouchers.length ? Math.round(totalPoints / vouchers.length) : 0,
      totalStock,
    };
  }, [vouchers]);

  const statCards = [
    { key: 'total',    label: 'Total Vouchers', value: formatNumber(metrics.total),     icon: 'confirmation_number', tone: 'primary' },
    { key: 'active',   label: 'Active',         value: formatNumber(metrics.active),    icon: 'check_circle',        tone: 'tertiary-soft' },
    { key: 'inactive', label: 'Inactive',       value: formatNumber(metrics.inactive),  icon: 'pause_circle',        tone: 'secondary-soft' },
    { key: 'avg',      label: 'Avg. Points',    value: formatNumber(metrics.avgPoints), icon: 'stars',               tone: 'primary-soft', suffix: 'pts' },
  ];

  // ── Search + status + category filtering ────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vouchers.filter((v) => {
      if (statusFilter === 'active' && !v.is_active) return false;
      if (statusFilter === 'inactive' && v.is_active) return false;
      if (categoryFilter !== 'all') {
        const id = String(v.category_id?._id || v.category_id || '');
        if (id !== categoryFilter) return false;
      }
      if (!q) return true;
      return [v.title, categoryName(v), v.description].join(' ').toLowerCase().includes(q);
    });
  }, [vouchers, search, statusFilter, categoryFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, categoryFilter, vouchers]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(startIndex, startIndex + PAGE_SIZE);
  const rangeStart = filtered.length ? startIndex + 1 : 0;
  const rangeEnd = Math.min(startIndex + PAGE_SIZE, filtered.length);

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

  const hasFilters = search.trim() !== '' || statusFilter !== 'all' || categoryFilter !== 'all';

  // ── Create / edit ───────────────────────────────────────────────────
  const openCreate = () => {
    setEditing(null);
    setFormError('');
    setFormOpen(true);
  };
  const openEdit = (voucher) => {
    setEditing(voucher);
    setFormError('');
    setFormOpen(true);
  };
  const closeForm = () => {
    if (saving) return;
    setFormOpen(false);
    setEditing(null);
    setFormError('');
  };

  const handleSubmit = async (payload) => {
    setSaving(true);
    setFormError('');
    try {
      if (editing) {
        const updated = await updateVoucher(editing._id, payload);
        // The update endpoint doesn't re-populate category_id; reattach the
        // category object locally so the table keeps showing the name.
        const category = categories.find((c) => String(c._id) === String(payload.category_id));
        setVouchers((prev) =>
          prev.map((v) => (v._id === editing._id ? { ...v, ...updated, category_id: category || updated.category_id } : v))
        );
      } else {
        const created = await createVoucher(payload);
        const category = categories.find((c) => String(c._id) === String(payload.category_id));
        setVouchers((prev) => [{ ...created, category_id: category || created.category_id }, ...prev]);
      }
      setFormOpen(false);
      setEditing(null);
    } catch (err) {
      setFormError(getAdminErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError('');
    try {
      await deleteVoucher(deleteTarget._id);
      setVouchers((prev) => prev.filter((v) => v._id !== deleteTarget._id));
      setDeleteTarget(null);
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  // ── Export the filtered vouchers as CSV ─────────────────────────────
  const handleExportCSV = () => {
    const header = ['Title', 'Category', 'Points', 'Quantity', 'Status', 'Valid Until', 'Validity', 'Created'];
    const escape = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const lines = filtered.map((v) =>
      [
        v.title,
        categoryName(v),
        v.points ?? 0,
        v.quantity_available ?? 0,
        v.is_active ? 'Active' : 'Inactive',
        v.valid_until ? formatDate(v.valid_until) : 'No expiry',
        isVoucherValid(v) ? 'Valid' : 'Expired',
        formatDate(v.createdAt),
      ]
        .map(escape)
        .join(',')
    );
    const csv = [header.map(escape).join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vouchers-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="admin-section">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="admin-page-head admin-orders-head">
        <div>
          <h1 className="admin-page-head__title admin-orders-title">
            Vouchers
            <span className="admin-pill">{formatNumber(metrics.total)} Total</span>
          </h1>
          <p className="admin-page-head__subtitle">
            Create and manage the rewards available in your catalogue.
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
            title="Download the current vouchers as CSV"
          >
            <span className="material-symbols-outlined" aria-hidden="true">download</span>
            Export CSV
          </button>
          <button type="button" className="admin-new-btn admin-new-btn--inline" onClick={openCreate}>
            <span className="material-symbols-outlined" aria-hidden="true">add</span>
            New Voucher
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

      {/* ── Filter bar ──────────────────────────────────────────────── */}
      {showFilters && (
        <div className="admin-filters">
          <div className="admin-filters__search">
            <span className="material-symbols-outlined" aria-hidden="true">search</span>
            <input
              type="text"
              placeholder="Search by name, category or description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search vouchers"
            />
          </div>
          <select
            className="admin-role-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            className="admin-role-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter by category"
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
          {hasFilters && (
            <button
              type="button"
              className="admin-panel__link"
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setCategoryFilter('all');
              }}
            >
              Clear
            </button>
          )}
        </div>
      )}

      {error && (
        <p className="admin-error" role="alert">
          <span className="material-symbols-outlined" aria-hidden="true">error</span>
          {error}
        </p>
      )}

      {/* ── Table ───────────────────────────────────────────────────── */}
      <div className="admin-panel">
        {loading ? (
          <div className="admin-loading">
            <span className="material-symbols-outlined admin-loading__spin" aria-hidden="true">
              progress_activity
            </span>
            Loading vouchers…
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={vouchers.length === 0 ? 'confirmation_number' : 'search_off'}
            title={vouchers.length === 0 ? 'No vouchers yet.' : 'No vouchers match your filters.'}
            hint={
              vouchers.length === 0
                ? 'Create your first reward to get started.'
                : 'Try a different search term, status or category.'
            }
            action={
              vouchers.length === 0 ? (
                <button type="button" className="admin-new-btn admin-new-btn--inline admin-empty__action" onClick={openCreate}>
                  <span className="material-symbols-outlined" aria-hidden="true">add</span>
                  New Voucher
                </button>
              ) : null
            }
          />
        ) : (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Voucher</th>
                    <th>Category</th>
                    <th className="admin-table__num">Points</th>
                    <th className="admin-table__num">Quantity</th>
                    <th>Status</th>
                    <th>Valid Until</th>
                    <th>Created</th>
                    <th className="admin-table__action">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((v) => (
                    <tr key={v._id}>
                      <td data-label="Voucher">
                        <div className="admin-table__user">
                          <span className="admin-voucher-thumb" aria-hidden="true">
                            {v.image ? (
                              <img src={v.image} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                            ) : (
                              <span className="material-symbols-outlined">{voucherIcon(v)}</span>
                            )}
                          </span>
                          <span className="admin-table__username">{v.title}</span>
                        </div>
                      </td>
                      <td data-label="Category">{categoryName(v)}</td>
                      <td data-label="Points" className="admin-table__num">
                        <span className="admin-order-amount">{formatNumber(v.points)} pts</span>
                      </td>
                      <td data-label="Quantity" className="admin-table__num">
                        {formatNumber(v.quantity_available)}
                      </td>
                      <td data-label="Status">
                        <span className={`admin-status admin-status--${v.is_active ? 'active' : 'inactive'}`}>
                          {v.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td data-label="Valid Until">
                        <div className="admin-validity-cell">
                          <span className="admin-validity-cell__date">
                            {v.valid_until ? formatDate(v.valid_until) : 'No expiry'}
                          </span>
                          <span
                            className={`admin-status admin-status--${
                              isVoucherValid(v) ? 'valid' : 'expired'
                            }`}
                          >
                            {isVoucherValid(v) ? 'Valid' : 'Expired'}
                          </span>
                        </div>
                      </td>
                      <td data-label="Created">{formatDate(v.createdAt)}</td>
                      <td data-label="Actions" className="admin-table__action">
                        <div className="admin-row-actions">
                          <button
                            type="button"
                            className="admin-icon-action"
                            onClick={() => openEdit(v)}
                            title="Edit voucher"
                            aria-label="Edit voucher"
                          >
                            <span className="material-symbols-outlined" aria-hidden="true">edit</span>
                          </button>
                          <button
                            type="button"
                            className="admin-icon-action admin-icon-action--danger"
                            onClick={() => setDeleteTarget(v)}
                            title="Delete voucher"
                            aria-label="Delete voucher"
                          >
                            <span className="material-symbols-outlined" aria-hidden="true">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="admin-pagination">
              <p className="admin-pagination__info">
                Showing {formatNumber(rangeStart)} to {formatNumber(rangeEnd)} of{' '}
                {formatNumber(filtered.length)} vouchers
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

      {/* ── Create / edit modal ─────────────────────────────────────── */}
      {formOpen && (
        <AdminVoucherForm
          voucher={editing}
          categories={categories}
          saving={saving}
          error={formError}
          onClose={closeForm}
          onSubmit={handleSubmit}
        />
      )}

      {/* ── Delete confirmation ─────────────────────────────────────── */}
      {deleteTarget && (
        <div className="admin-modal" role="dialog" aria-modal="true" aria-label="Confirm delete">
          <div className="admin-modal__backdrop" onClick={() => !deleting && setDeleteTarget(null)} />
          <div className="admin-modal__card admin-modal__card--sm">
            <div className="admin-modal__body admin-modal__body--center">
              <span className="admin-modal__warn">
                <span className="material-symbols-outlined" aria-hidden="true">delete</span>
              </span>
              <h2 className="admin-modal__title">Delete voucher?</h2>
              <p className="admin-modal__text">
                “{deleteTarget.title}” will be permanently removed. This can’t be undone.
              </p>
              <div className="admin-modal__footer admin-modal__footer--center">
                <button
                  type="button"
                  className="admin-refresh"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn--danger admin-btn--solid-danger"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default AdminVouchers;
