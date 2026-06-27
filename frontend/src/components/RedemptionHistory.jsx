import { useEffect, useState } from 'react';
import { getOrderHistory } from '../api/cart';

const formatPoints = (n) => Number(n || 0).toLocaleString();

const formatDate = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

/**
 * Fetches and renders the signed-in user's voucher redemption history (newest
 * first). Shared by the Points and Profile pages so both stay in sync.
 *
 * @param {{ emptyText?: string, limit?: number }} props
 *   emptyText - message shown when there are no redemptions yet.
 *   limit     - cap the number of rows shown (e.g. a compact list on Profile).
 */
const RedemptionHistory = ({ emptyText, limit }) => {
  const [orders, setOrders] = useState(null); // null = still loading
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getOrderHistory()
      .then((data) => {
        if (active) {
          setOrders(data);
          setError('');
        }
      })
      .catch(() => {
        if (active) {
          setOrders([]);
          setError('Could not load your history. Make sure the backend is running.');
        }
      });
    return () => {
      active = false;
    };
  }, []);

  if (orders === null) {
    return <p className="history__status">Loading your history…</p>;
  }

  if (orders.length === 0) {
    return (
      <div className="history__empty">
        <span className="material-symbols-outlined">receipt_long</span>
        <p className="text-body-md">
          {emptyText || 'No activity yet. Redeem a voucher to start building your history.'}
        </p>
        {error && <p className="history__error">{error}</p>}
      </div>
    );
  }

  const rows = limit ? orders.slice(0, limit) : orders;

  return (
    <ul className="history__list">
      {rows.map((order) => (
        <li className="history__row" key={order._id}>
          <span className="material-symbols-outlined history__icon" aria-hidden="true">
            redeem
          </span>
          <div className="history__info">
            <p className="history__name">
              {order.voucher_title || order.voucher_id?.title || 'Voucher'}
            </p>
            <p className="history__meta">
              {formatDate(order.order_date)}
              {order.quantity > 1 ? ` · Qty ${order.quantity}` : ''}
            </p>
          </div>
          <span className="history__amount">−{formatPoints(order.points_deducted)} pts</span>
        </li>
      ))}
    </ul>
  );
};

export default RedemptionHistory;
