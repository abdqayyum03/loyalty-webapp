import { useCallback, useEffect, useState } from 'react';
import { getCart, removeFromCart, checkout } from '../api/cart';
import { useRedeem } from '../hooks/useRedeem';
import RedeemModal from '../components/RedeemModal';
import { CartListSkeleton } from '../components/Skeleton';
import { useToast } from '../components/ToastProvider';

const formatPoints = (n) => `${Number(n || 0).toLocaleString()} pts`;

/**
 * "My Selections" — the cart page. Lists every voucher the user has added,
 * with a summary sidebar and a Redeem All call-to-action.
 *
 * @param {{ onContinueShopping: () => void, onCartChange?: (count: number) => void }} props
 */
const Cart = ({ onContinueShopping, onCartChange }) => {
  const [items, setItems] = useState([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [removingId, setRemovingId] = useState(null);
  const toast = useToast();

  const load = useCallback(() => {
    setLoading(true);
    getCart()
      .then(({ items, totalPoints, totalQuantity }) => {
        setItems(items);
        setTotalPoints(totalPoints);
        setTotalQuantity(totalQuantity);
        onCartChange?.(totalQuantity);
        setError('');
      })
      .catch(() => {
        setError('Unable to load your cart. Make sure you are signed in and the backend is running.');
      })
      .finally(() => setLoading(false));
  }, [onCartChange]);

  useEffect(() => {
    load();
  }, [load]);

  // Redeem everything in the cart. On success the cart is empty, so reload it
  // (which also refreshes the nav-bar badge via onCartChange).
  const redeem = useRedeem({ onSuccess: load });

  const handleRemove = (cartItemId) => {
    setRemovingId(cartItemId);
    removeFromCart(cartItemId)
      .then(() => {
        load();
        toast.success('Removed from cart');
      })
      .catch(() => {
        setError('Could not remove that item. Please try again.');
        toast.error('Could not remove that item.');
      })
      .finally(() => setRemovingId(null));
  };

  const handleRedeem = () => {
    if (items.length === 0) return;
    redeem.run(() => checkout());
  };

  if (loading) {
    return (
      <main className="main-content container-max page-px">
        <div className="cart__heading">
          <h1 className="text-headline-lg-mobile cart__title">My Selections</h1>
          <p className="text-body-md cart__subtitle">
            Review your selected vouchers before final redemption.
          </p>
        </div>
        <CartListSkeleton count={3} />
      </main>
    );
  }

  return (
    <main className="main-content container-max page-px">

      {/* Page header */}
      <div className="cart__heading">
        <h1 className="text-headline-lg-mobile cart__title">My Selections</h1>
        <p className="text-body-md cart__subtitle">
          Review your selected vouchers before final redemption.
        </p>
      </div>

      {error && <p className="cart__error">{error}</p>}

      {items.length === 0 ? (
        /* Empty state */
        <div className="vouchers-empty-state">
          <span className="material-symbols-outlined vouchers-empty-state__icon">
            shopping_cart_off
          </span>
          <p className="text-headline-md">Your cart is empty</p>
          <p className="text-body-md vouchers-empty-state__hint">
            Browse the catalogue and add vouchers to get started.
          </p>
          <button className="chip chip--active" onClick={onContinueShopping}>
            Browse Vouchers
          </button>
        </div>
      ) : (
        <div className="cart__grid">

          {/* ── Items list ── */}
          <div className="cart__list">
            {items.map(({ cartItemId, quantity, pointsRequired, voucher }) => (
              <div key={cartItemId} className="cart__item">
                <div className="cart__item-image-wrap">
                  {voucher.image ? (
                    <img
                      src={voucher.image}
                      alt={voucher.imageAlt}
                      className="cart__item-image"
                    />
                  ) : (
                    <span className="material-symbols-outlined cart__item-image-fallback">
                      {voucher.icon}
                    </span>
                  )}
                </div>

                <div className="cart__item-body">
                  <div className="cart__item-top">
                    <div>
                      <span className="cart__item-badge">{voucher.category}</span>
                      <h3 className="cart__item-title">{voucher.title}</h3>
                    </div>
                    <button
                      className="cart__item-remove"
                      onClick={() => handleRemove(cartItemId)}
                      disabled={removingId === cartItemId}
                      aria-label={`Remove ${voucher.title}`}
                    >
                      <span className="material-symbols-outlined">
                        {removingId === cartItemId ? 'hourglass_empty' : 'delete'}
                      </span>
                    </button>
                  </div>

                  <p className="cart__item-desc">{voucher.description}</p>

                  <div className="cart__item-foot">
                    <span className="cart__item-qty">
                      {quantity > 1 ? `Quantity: ${quantity}` : 'Quantity: 1'}
                    </span>
                    <span className="cart__item-price">{formatPoints(pointsRequired)}</span>
                  </div>
                </div>
              </div>
            ))}

            <button className="cart__continue" onClick={onContinueShopping}>
              <span className="material-symbols-outlined">arrow_back</span>
              Continue Shopping
            </button>
          </div>

          {/* ── Summary sidebar ── */}
          <aside className="cart__summary">
            <h2 className="cart__summary-title">Summary</h2>

            <div className="cart__summary-rows">
              <div className="cart__summary-row">
                <span>Subtotal ({totalQuantity} item{totalQuantity !== 1 ? 's' : ''})</span>
                <span>{formatPoints(totalPoints)}</span>
              </div>
              <div className="cart__summary-row">
                <span>Processing Fee</span>
                <span>0 pts</span>
              </div>
            </div>

            <div className="cart__summary-total-wrap">
              <div className="cart__summary-total">
                <span className="cart__summary-total-label">Total</span>
                <span className="cart__summary-total-value">{formatPoints(totalPoints)}</span>
              </div>
              <p className="cart__summary-currency">Reward Points</p>
            </div>

            <button
              className="cart__redeem-all"
              onClick={handleRedeem}
              disabled={redeem.state === 'loading'}
            >
              {redeem.state === 'loading' ? 'Processing…' : 'Redeem All'}
              <span className="material-symbols-outlined">
                {redeem.state === 'loading' ? 'progress_activity' : 'check_circle'}
              </span>
            </button>

            <p className="cart__secure">
              <span className="material-symbols-outlined">lock</span>
              Secure Transaction
            </p>
          </aside>
        </div>
      )}

      {/* Redeem modal: loading → success / error (shared with the voucher page) */}
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
          onContinueShopping?.();
        }}
      />
    </main>
  );
};

export default Cart;
