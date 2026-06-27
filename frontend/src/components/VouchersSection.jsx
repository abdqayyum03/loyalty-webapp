import VoucherCard from './VoucherCard';
import { VoucherCardSkeleton } from './Skeleton';
import { getVouchers } from '../api/voucher';
import { useEffect, useMemo, useState } from 'react';

/**
 * Homepage vouchers teaser — shows the 3 newest vouchers with an "Explore More"
 * link to the full Vouchers page.
 *
 * @param {{ onExplore: (id: string) => void, onViewAll: () => void }} props
 */
const VouchersSection = ({ onExplore, onViewAll }) => {
  const [vouchers, setVouchers] = useState([]);
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

  // The 3 newest vouchers (most recently created first).
  const newest = useMemo(
    () =>
      [...vouchers]
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, 3),
    [vouchers]
  );

  return (
    <section className="vouchers-section">

      {/* Section Header */}
      <div className="section-header">
        <h2 className="text-headline-md">Available Vouchers</h2>
      </div>

      {/* Voucher Grid */}
      <div className="voucher-grid">
        {loading ? (
          Array.from({ length: 3 }, (_, i) => <VoucherCardSkeleton key={i} />)
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
        ) : newest.length > 0 ? (
          newest.map((v) => (
            <VoucherCard
              key={v.id}
              {...v}
              onExplore={() => onExplore?.(v.id)}
            />
          ))
        ) : (
          <p className="vouchers-empty">No vouchers available yet.</p>
        )}
      </div>

      {/* Explore More → full Vouchers page */}
      {!loading && !error && newest.length > 0 && (
        <div className="vouchers-section__more">
          <button className="vouchers-section__more-btn" onClick={() => onViewAll?.()}>
            Explore More
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
      )}

    </section>
  );
};

export default VouchersSection;
