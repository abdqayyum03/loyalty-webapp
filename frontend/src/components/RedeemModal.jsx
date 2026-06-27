const formatPoints = (n) => `${Number(n || 0).toLocaleString()} pts`;

/**
 * Loading → success / error modal for a redemption. Driven entirely by the
 * `useRedeem` hook, so it works for both the cart and a single voucher.
 *
 * @param {{
 *   state: 'idle' | 'loading' | 'success' | 'error',
 *   result?: object,            // orderDetails on success
 *   error?: string,
 *   errorCode?: string,         // machine code, e.g. 'VOUCHER_EXPIRED'
 *   downloadingId?: string,     // order whose receipt is downloading
 *   onDownloadReceipt: (orderId: string) => void,
 *   onClose: () => void,
 *   onBrowseVouchers?: () => void, // shown on expired-voucher errors
 * }} props
 */
const RedeemModal = ({
  state,
  result,
  error,
  errorCode,
  downloadingId,
  onDownloadReceipt,
  onClose,
  onBrowseVouchers,
}) => {
  if (state === 'idle') return null;

  const orders = result?.orders || [];
  const expired = errorCode === 'VOUCHER_EXPIRED';

  return (
    <div className="redeem-modal" role="dialog" aria-modal="true" aria-labelledby="redeem-modal-title">
      {/* Block clicks during loading; allow dismiss-on-backdrop otherwise. */}
      <div
        className="redeem-modal__backdrop"
        onClick={state === 'loading' ? undefined : onClose}
        aria-hidden="true"
      />

      <div className="redeem-modal__card">
        {state === 'loading' && (
          <div className="redeem-modal__body redeem-modal__body--center">
            <span className="material-symbols-outlined redeem-modal__spinner" aria-hidden="true">
              progress_activity
            </span>
            <h2 id="redeem-modal-title" className="redeem-modal__title">
              Redeeming your voucher…
            </h2>
            <p className="redeem-modal__text">
              Deducting points and generating your receipt. This only takes a moment.
            </p>
          </div>
        )}

        {state === 'success' && (
          <div className="redeem-modal__body">
            <div className="redeem-modal__head">
              <span
                className="material-symbols-outlined redeem-modal__icon redeem-modal__icon--success"
                aria-hidden="true"
              >
                check_circle
              </span>
              <div>
                <h2 id="redeem-modal-title" className="redeem-modal__title">
                  Redemption successful!
                </h2>
                <p className="redeem-modal__text">
                  {result?.totalItems} item{result?.totalItems !== 1 ? 's' : ''} redeemed ·{' '}
                  {formatPoints(result?.totalPoints)} · {formatPoints(result?.userRemainingPoints)} remaining
                </p>
              </div>
            </div>

            <p className="redeem-modal__subtext">
              Download your receipt{orders.length > 1 ? 's' : ''}:
            </p>
            <ul className="redeem-modal__receipts">
              {orders.map((order) => (
                <li className="redeem-modal__receipt" key={order.orderId}>
                  <div>
                    <span className="redeem-modal__receipt-title">{order.voucherTitle}</span>
                    <span className="redeem-modal__receipt-meta">{formatPoints(order.points)}</span>
                  </div>
                  <button
                    type="button"
                    className="redeem-modal__download"
                    onClick={() => onDownloadReceipt(order.orderId)}
                    disabled={downloadingId === order.orderId}
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">
                      {downloadingId === order.orderId ? 'progress_activity' : 'download'}
                    </span>
                    {downloadingId === order.orderId ? 'Saving…' : 'Receipt (PDF)'}
                  </button>
                </li>
              ))}
            </ul>

            {error && <p className="redeem-modal__error">{error}</p>}

            <button type="button" className="redeem-modal__done" onClick={onClose}>
              Done
            </button>
          </div>
        )}

        {state === 'error' && (
          <div className="redeem-modal__body">
            <div className="redeem-modal__head">
              <span
                className="material-symbols-outlined redeem-modal__icon redeem-modal__icon--error"
                aria-hidden="true"
              >
                {expired ? 'event_busy' : 'error'}
              </span>
              <div>
                <h2 id="redeem-modal-title" className="redeem-modal__title">
                  {expired ? 'Voucher already expired' : 'Redemption failed'}
                </h2>
                <p className="redeem-modal__text">{error}</p>
              </div>
            </div>

            {expired && onBrowseVouchers ? (
              <div className="redeem-modal__actions">
                <button
                  type="button"
                  className="redeem-modal__done redeem-modal__done--ghost"
                  onClick={onClose}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="redeem-modal__done"
                  onClick={onBrowseVouchers}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">redeem</span>
                  Browse Vouchers
                </button>
              </div>
            ) : (
              <button type="button" className="redeem-modal__done" onClick={onClose}>
                Close
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RedeemModal;
