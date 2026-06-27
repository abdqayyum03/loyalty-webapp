import { useEffect, useMemo, useState } from 'react';
import VoucherCard from '../components/VoucherCard';
import { VoucherGridSkeleton } from '../components/Skeleton';
import { getVoucherCategories, getVouchers } from '../api/voucher';

/**
 * @param {{ onSelectProduct: (id: string) => void }} props
 */
const Products = ({ onSelectProduct }) => {
  const [vouchers, setVouchers] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    getVouchers()
      .then((data) => {
        if (isMounted) {
          setVouchers(data);
          setError('');
        }
      })
      .catch(() => {
        if (isMounted) {
          setError({
            title: 'Server is currently unavailable.',
            description: 'We will restore service as soon as possible. Please try again later.',
          });
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const categories = useMemo(() => getVoucherCategories(vouchers), [vouchers]);

  const filtered = vouchers.filter((v) => {
    const matchesCategory = activeCategory === 'All' || v.category === activeCategory;
    const matchesSearch =
      searchQuery === '' ||
      v.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <main className="main-content container-max page-px">

      {/* Page Header */}
      <div className="products-page__header">
        <h1 className="text-headline-lg-mobile products-page__title">All Vouchers</h1>
        <p className="text-body-lg products-page__subtitle">
          Browse our full catalogue of verified vouchers and exclusive offers.
        </p>

        {/* Search Bar */}
        <div className="products-page__search-wrap">
          <span className="material-symbols-outlined products-page__search-icon">search</span>
          <input
            className="products-page__search-input"
            type="text"
            placeholder="Search vouchers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="products-page__search-clear icon-btn"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Chips */}
      <div className="filter-chips">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`chip ${activeCategory === cat ? 'chip--active' : 'chip--inactive'}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Results count */}
      {!loading && !error && (
        <p className="products-page__count text-label-sm">
          {filtered.length} voucher{filtered.length !== 1 ? 's' : ''} found
        </p>
      )}

      {/* Grid */}
      {loading ? (
        <VoucherGridSkeleton count={6} />
      ) : error ? (
        <div className="vouchers-empty-state">
          <span className="material-symbols-outlined vouchers-empty-state__icon">
            cloud_off
          </span>
          <p className="text-headline-md">{error.title}</p>
          <p className="text-body-md vouchers-empty-state__hint">
            {error.description}
          </p>
        </div>
      ) : filtered.length > 0 ? (
        <div className="voucher-grid">
          {filtered.map((v) => (
            <VoucherCard
              key={v.id}
              {...v}
              onExplore={() => onSelectProduct?.(v.id)}
            />
          ))}
        </div>
      ) : (
        <div className="vouchers-empty-state">
          <span className="material-symbols-outlined vouchers-empty-state__icon">
            search_off
          </span>
          <p className="text-headline-md">No vouchers found</p>
          <p className="text-body-md vouchers-empty-state__hint">
            Try a different category or clear the search.
          </p>
          <button
            className="chip chip--active"
            onClick={() => { setActiveCategory('All'); setSearchQuery(''); }}
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Page Footer */}
      {!loading && !error && filtered.length > 0 && (
        <div className="products-page__footer">
          <p className="text-body-lg products-page__subtitle">
            You've reached the end of the list.
          </p>
        </div>
      )}

    </main>
  );
};

export default Products;
