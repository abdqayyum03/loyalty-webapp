import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getAllCategories,
  getAllVouchers,
  createCategory,
  updateCategory,
  deleteCategory,
  getAdminErrorMessage,
} from '../../api/admin';
import AdminCategoryForm from './AdminCategoryForm';

/**
 * Admin → Categories.
 *
 * Management view for voucher categories (the mockup's list screen): summary
 * cards, a table of every category with its live voucher count, and create /
 * edit / delete actions. Self-contained — it loads its own categories *and*
 * vouchers (the latter only to count how many vouchers sit in each category).
 */

const PAGE_SIZE = 8;

const formatNumber = (n) => Number(n || 0).toLocaleString();

// Same keyword→icon fallback used in the vouchers view, so a category with no
// saved icon still shows something sensible based on its name.
const ICON_BY_KEYWORD = [
  [/food|drink|beverage|restaurant|cafe|dining/i, 'restaurant'],
  [/shop|retail|store|mall|grocery/i, 'shopping_bag'],
  [/travel|flight|hotel|holiday|trip/i, 'flight'],
  [/electronic|tech|gadget|device/i, 'devices'],
  [/fashion|cloth|apparel|wear/i, 'checkroom'],
  [/beauty|health|spa|wellness/i, 'spa'],
  [/entertain|movie|game|fun/i, 'sports_esports'],
];

const categoryIcon = (category) => {
  if (category.icon) return category.icon;
  const match = ICON_BY_KEYWORD.find(([re]) => re.test(category.name || ''));
  return match ? match[1] : 'category';
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

const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [categoryData, voucherData] = await Promise.all([
        getAllCategories(),
        getAllVouchers(),
      ]);
      setCategories(categoryData);
      setVouchers(voucherData);
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Active voucher count per category id (drives the table + summary cards).
  const countsByCategory = useMemo(() => {
    const map = new Map();
    for (const v of vouchers) {
      if (!v.is_active) continue;
      const id = String(v.category_id?._id || v.category_id || '');
      if (!id) continue;
      map.set(id, (map.get(id) || 0) + 1);
    }
    return map;
  }, [vouchers]);

  const activeCount = (category) => countsByCategory.get(String(category._id)) || 0;

  // ── Summary cards (all derived) ─────────────────────────────────────
  const summary = useMemo(() => {
    const totalActiveVouchers = [...countsByCategory.values()].reduce((a, b) => a + b, 0);
    let popular = null;
    let popularCount = -1;
    for (const c of categories) {
      const count = countsByCategory.get(String(c._id)) || 0;
      if (count > popularCount) {
        popularCount = count;
        popular = c;
      }
    }
    const share = totalActiveVouchers > 0 && popularCount > 0
      ? Math.round((popularCount / totalActiveVouchers) * 100)
      : 0;
    return {
      total: categories.length,
      totalActiveVouchers,
      popularName: popular?.name || '—',
      popularShare: share,
    };
  }, [categories, countsByCategory]);

  // ── Filtering ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) =>
      [c.name, c.description].join(' ').toLowerCase().includes(q)
    );
  }, [categories, search]);

  useEffect(() => {
    setPage(1);
  }, [search, categories]);

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

  const hasFilters = search.trim() !== '';

  // ── Create / edit ───────────────────────────────────────────────────
  const openCreate = () => {
    setEditing(null);
    setFormError('');
    setFormOpen(true);
  };
  const openEdit = (category) => {
    setEditing(category);
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
        const updated = await updateCategory(editing._id, payload);
        setCategories((prev) => prev.map((c) => (c._id === editing._id ? { ...c, ...updated } : c)));
      } else {
        const created = await createCategory(payload);
        setCategories((prev) => [created, ...prev]);
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
      await deleteCategory(deleteTarget._id);
      setCategories((prev) => prev.filter((c) => c._id !== deleteTarget._id));
      setDeleteTarget(null);
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  // ── Export CSV ──────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const header = ['Name', 'Description', 'Active Vouchers', 'Created'];
    const escape = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const lines = filtered.map((c) =>
      [
        c.name,
        c.description,
        activeCount(c),
        c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-MY') : '',
      ]
        .map(escape)
        .join(',')
    );
    const csv = [header.map(escape).join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `categories-${new Date().toISOString().slice(0, 10)}.csv`;
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
            Category Management
            <span className="admin-pill">{formatNumber(summary.total)} Total</span>
          </h1>
          <p className="admin-page-head__subtitle">
            Organize and manage your voucher redemption ecosystem.
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
            title="Download the current categories as CSV"
          >
            <span className="material-symbols-outlined" aria-hidden="true">download</span>
            Export CSV
          </button>
          <button type="button" className="admin-new-btn admin-new-btn--inline" onClick={openCreate}>
            <span className="material-symbols-outlined" aria-hidden="true">add</span>
            Create Category
          </button>
        </div>
      </div>

      {/* ── Summary cards ───────────────────────────────────────────── */}
      <div className="admin-stats admin-stats--cat">
        <div className="admin-stat-card">
          <p className="admin-stat-card__label admin-stat-card__label--upper">Total Categories</p>
          <p className="admin-stat-card__value">{formatNumber(summary.total)}</p>
        </div>
        <div className="admin-stat-card">
          <p className="admin-stat-card__label admin-stat-card__label--upper">Popular Category</p>
          <p className="admin-stat-card__value admin-stat-card__value--text">{summary.popularName}</p>
          <p className="admin-stat-card__sub">
            {summary.popularShare > 0 ? `${summary.popularShare}% of active vouchers` : 'No vouchers yet'}
          </p>
        </div>
        <div className="admin-stat-card admin-stat-card--accent">
          <p className="admin-stat-card__label admin-stat-card__label--upper">Active Vouchers</p>
          <p className="admin-stat-card__value">{formatNumber(summary.totalActiveVouchers)}</p>
          <p className="admin-stat-card__sub">Across all categories</p>
        </div>
      </div>

      {/* ── Filter bar ──────────────────────────────────────────────── */}
      {showFilters && (
        <div className="admin-filters">
          <div className="admin-filters__search">
            <span className="material-symbols-outlined" aria-hidden="true">search</span>
            <input
              type="text"
              placeholder="Search by name or description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search categories"
            />
          </div>
          {hasFilters && (
            <button
              type="button"
              className="admin-panel__link"
              onClick={() => setSearch('')}
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
            Loading categories…
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={categories.length === 0 ? 'category' : 'search_off'}
            title={categories.length === 0 ? 'No categories yet.' : 'No categories match your filters.'}
            hint={
              categories.length === 0
                ? 'Create your first category to group vouchers.'
                : 'Try a different search term or status.'
            }
            action={
              categories.length === 0 ? (
                <button type="button" className="admin-new-btn admin-new-btn--inline admin-empty__action" onClick={openCreate}>
                  <span className="material-symbols-outlined" aria-hidden="true">add</span>
                  Create Category
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
                    <th>Category Name</th>
                    <th className="admin-table__num">Active Vouchers</th>
                    <th className="admin-table__action">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((c) => (
                    <tr key={c._id}>
                      <td data-label="Category">
                        <div className="admin-table__user">
                          <span className="admin-voucher-thumb admin-cat-thumb" aria-hidden="true">
                            <span className="material-symbols-outlined">{categoryIcon(c)}</span>
                          </span>
                          <span className="admin-cat-cell">
                            <span className="admin-table__username">{c.name}</span>
                            {c.description && (
                              <span className="admin-table__sub">{c.description}</span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td data-label="Active Vouchers" className="admin-table__num">
                        <span className="admin-order-amount">{formatNumber(activeCount(c))}</span>
                      </td>
                      <td data-label="Actions" className="admin-table__action">
                        <div className="admin-row-actions">
                          <button
                            type="button"
                            className="admin-icon-action"
                            onClick={() => openEdit(c)}
                            title="Edit category"
                            aria-label="Edit category"
                          >
                            <span className="material-symbols-outlined" aria-hidden="true">edit</span>
                          </button>
                          <button
                            type="button"
                            className="admin-icon-action admin-icon-action--danger"
                            onClick={() => setDeleteTarget(c)}
                            title="Delete category"
                            aria-label="Delete category"
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
                {formatNumber(filtered.length)} categories
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

      {/* ── Bottom feature cards ────────────────────────────────────── */}
      <div className="admin-panels admin-orders-panels">
        <div className="admin-tip-card">
          <div>
            <span className="admin-tip-card__eyebrow">Admin Tip</span>
            <h3 className="admin-tip-card__title">Optimize Category Reach</h3>
            <p className="admin-tip-card__text">
              Users redeem 2.4× more vouchers when categories are descriptive and visually
              tagged with icons.
            </p>
          </div>
          <span className="admin-tip-card__icon" aria-hidden="true">
            <span className="material-symbols-outlined">lightbulb</span>
          </span>
        </div>

        <div className="admin-dist-card">
          <h3 className="admin-dist-card__title">Voucher Distribution</h3>
          <p className="admin-dist-card__text">
            {summary.popularShare > 0
              ? `${summary.popularName} currently leads with ${summary.popularShare}% of the active voucher pool.`
              : 'Voucher distribution will appear here once vouchers are assigned to categories.'}
          </p>
          <div className="admin-dist-card__bar">
            <div
              className="admin-dist-card__fill"
              style={{ width: `${summary.popularShare}%` }}
            />
          </div>
          <div className="admin-dist-card__scale">
            <span>0%</span>
            <span className="admin-dist-card__current">{summary.popularShare}%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* ── Create / edit modal ─────────────────────────────────────── */}
      {formOpen && (
        <AdminCategoryForm
          category={editing}
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
              <h2 className="admin-modal__title">Delete category?</h2>
              <p className="admin-modal__text">
                “{deleteTarget.name}” will be permanently removed. Vouchers in this category will
                keep their reference but lose the category label.
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

export default AdminCategories;
