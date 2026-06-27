import { useEffect, useState } from 'react';
import { getVoucherById } from '../api/voucher';
import { redeemVoucher } from '../api/cart';
import { useRedeem } from '../hooks/useRedeem';
import RedeemModal from '../components/RedeemModal';
import { useToast } from '../components/ToastProvider';

/**
 * @param {{
 *   voucherId: string,
 *   onBack: () => void,
 *   onAddToCart?: (id: string) => Promise<unknown> | void,
 *   onRedeemed?: () => void,
 * }} props
 */
const ProductDetail = ({ voucherId, onBack, onAddToCart, onRedeemed }) => {
  const [voucher, setVoucher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const toast = useToast();

  // Transient "Added ✓" feedback for the Add to Cart button.
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const handleAddToCart = async () => {
    if (adding || !onAddToCart || !voucher) return;
    setAdding(true);
    try {
      await onAddToCart(voucher.id);
      setAdded(true);
      toast.success(`${voucher.title} added to cart`);
      setTimeout(() => setAdded(false), 1800);
    } catch {
      toast.error('Could not add to cart. Please try again.');
    } finally {
      setAdding(false);
    }
  };

  // Redeem just this voucher directly (skips the cart). On success, let the
  // parent refresh the points balance.
  const redeem = useRedeem({ onSuccess: () => onRedeemed?.() });

  const handleRedeemNow = () => {
    if (!voucher) return;
    // Expired vouchers can't be redeemed — show the expired popup straight away
    // (the backend enforces this too, as a safety net).
    if (voucher.badge === 'EXPIRED') {
      redeem.fail(
        'This voucher has already expired and can no longer be redeemed.',
        'VOUCHER_EXPIRED'
      );
      return;
    }
    redeem.run(() => redeemVoucher(voucher.id));
  };

  useEffect(() => {
    let isMounted = true;

    if (!voucherId) {
      setLoading(false);
      setError('Voucher not found');
      return () => {
        isMounted = false;
      };
    }

    setLoading(true);
    getVoucherById(voucherId)
      .then((data) => {
        if (isMounted) {
          setVoucher(data);
          setError('');
        }
      })
      .catch(() => {
        if (isMounted) {
          setVoucher(null);
          setError('Voucher not found');
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
  }, [voucherId]);

  if (loading) {
    return (
      <main className="main-content container-max page-px">
        <p className="vouchers-empty">Loading voucher...</p>
      </main>
    );
  }

  if (error || !voucher) {
    return (
      <main className="main-content container-max page-px">
        <div className="vouchers-empty-state">
          <span className="material-symbols-outlined vouchers-empty-state__icon">error_outline</span>
          <p className="text-headline-md">{error || 'Voucher not found'}</p>
          <button className="chip chip--active" onClick={onBack}>Go back</button>
        </div>
      </main>
    );
  }

  return (
    <main className="main-content container-max page-px">

      {/* Back link */}
      <div className="detail__back">
        <button className="detail__back-btn" onClick={onBack}>
          <span className="material-symbols-outlined">arrow_back</span>
          Back to Products
        </button>
      </div>

      {/* Bento Layout */}
      <div className="detail__grid">

        {/* ── Left Column: Image + Quick Stats ── */}
        <div className="detail__left">

          {/* Main Image */}
          <div className="detail__image-card">
            <img
              src={voucher.image}
              alt={voucher.imageAlt}
              className="detail__image"
            />
            {voucher.verified && (
              <div className="detail__verified-badge">
                <span
                  className="material-symbols-outlined"
                  style={{ fontVariationSettings: "'FILL' 1", fontSize: '16px' }}
                >
                  verified
                </span>
                Verified Partner
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="detail__stats-grid">
            <div className="detail__stat-card">
              <div className="detail__stat-icon">
                <span className="material-symbols-outlined">schedule</span>
              </div>
              <div className="detail__stat-text">
                <p className="text-label-sm detail__stat-label">Valid Until</p>
                <p className="text-body-md detail__stat-value">{voucher.validUntil}</p>
              </div>
            </div>
            <div className="detail__stat-card">
              <div className="detail__stat-icon">
                <span className="material-symbols-outlined">sell</span>
              </div>
              <div className="detail__stat-text">
                <p className="text-label-sm detail__stat-label">Voucher Type</p>
                <p className="text-body-md detail__stat-value">{voucher.voucherType}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Column: Ticket Card ── */}
        <div className="detail__right">
          <div className="detail__ticket">

            {/* Perforated left edge */}
            <div className="detail__ticket-perf" />

            <div className="detail__ticket-body">

              {/* Header */}
              <div className="detail__ticket-header">
                <h1 className="text-headline-lg-mobile detail__ticket-title">
                  {voucher.detailTitle}
                </h1>
                <p className="text-body-lg detail__ticket-subtitle">
                  {voucher.detailDescription}
                </p>
              </div>

              {/* Value Details */}
              <div className="detail__section">
                <h2 className="text-headline-md detail__section-title">Value Details</h2>
                <div className="detail__value-box">
                  <div className="detail__value-row">
                    <span className="text-body-md detail__value-label">Estimated Retail Value</span>
                    <span className="text-body-md detail__value-amount">{voucher.retailValue}</span>
                  </div>
                  <div className="detail__value-row">
                    <span className="text-body-md detail__value-label">Your Cost</span>
                    <span className="text-body-md detail__value-amount detail__value-amount--free">
                      {voucher.yourCost}
                    </span>
                  </div>
                </div>
              </div>

              {/* Terms */}
              <div className="detail__section detail__section--grow">
                <h2 className="text-headline-md detail__section-title">Terms &amp; Conditions</h2>
                <ul className="detail__terms-list">
                  {voucher.terms.map((term, i) => (
                    <li key={i} className="text-body-md detail__terms-item">
                      {term}
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA — expired vouchers show a notice instead of the buttons */}
              <div className="detail__cta-area">
                {voucher.badge === 'EXPIRED' ? (
                  <div className="detail__expired" role="alert">
                    <div className="detail__expired-head">
                      <span className="material-symbols-outlined detail__expired-icon" aria-hidden="true">
                        event_busy
                      </span>
                      <div>
                        <h3 className="detail__expired-title">Voucher already expired</h3>
                        <p className="detail__expired-text">
                          This voucher has already expired and can no longer be redeemed.
                        </p>
                      </div>
                    </div>
                    <button className="detail__redeem-btn" onClick={() => onBack?.()}>
                      <span className="material-symbols-outlined">redeem</span>
                      Browse Vouchers
                    </button>
                  </div>
                ) : (
                  <>
                    {onAddToCart && (
                      <button
                        className={`detail__addcart-btn${added ? ' detail__addcart-btn--added' : ''}`}
                        onClick={handleAddToCart}
                        disabled={adding}
                      >
                        <span className="material-symbols-outlined">
                          {added ? 'check_circle' : 'add_shopping_cart'}
                        </span>
                        {added ? 'Added to Cart' : adding ? 'Adding...' : 'Add to Cart'}
                      </button>
                    )}
                    <button
                      className="detail__redeem-btn"
                      onClick={handleRedeemNow}
                      disabled={redeem.state === 'loading'}
                    >
                      <span className="material-symbols-outlined">
                        {redeem.state === 'loading' ? 'progress_activity' : 'qr_code_scanner'}
                      </span>
                      {redeem.state === 'loading' ? 'Redeeming…' : 'Redeem Now'}
                    </button>
                    <p className="text-label-sm detail__cta-hint">
                      Clicking 'Redeem Now' deducts the points and issues your receipt instantly.
                    </p>
                  </>
                )}
              </div>

            </div>
          </div>
        </div>

      </div>

      {/* Redeem modal: loading → success / error (shared with the cart) */}
      <RedeemModal
        state={redeem.state}
        result={redeem.result}
        error={redeem.error}
        errorCode={redeem.errorCode}
        downloadingId={redeem.downloadingId}
        onDownloadReceipt={redeem.downloadReceipt}
        onClose={redeem.close}
        onBrowseVouchers={() => {
          redeem.close();
          onBack?.();
        }}
      />
    </main>
  );
};

export default ProductDetail;
