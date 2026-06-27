import { useEffect } from 'react';

/**
 * Simple Terms & Conditions popup for voucher redemption.
 * Visibility is controlled by the parent (e.g. the Footer link).
 *
 * @param {{ open: boolean, onClose: () => void }} props
 */
const TermsModal = ({ open, onClose }) => {
  // Dismiss on Escape while the dialog is open.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="terms-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-modal-title"
    >
      <div className="terms-modal__backdrop" onClick={onClose} aria-hidden="true" />

      <div className="terms-modal__card">
        <div className="terms-modal__head">
          <h2 id="terms-modal-title" className="terms-modal__title">
            Terms &amp; Conditions
          </h2>
          <button
            type="button"
            className="terms-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              close
            </span>
          </button>
        </div>

        <div className="terms-modal__body">
          <p className="terms-modal__intro">
            Please review these terms before redeeming a voucher with your points.
          </p>

          <ol className="terms-modal__list">
            <li>
              Vouchers may only be redeemed using points available in your CartRedeem
              account at the time of redemption.
            </li>
            <li>
              The points required for each voucher are shown on the voucher and are
              deducted in full once a redemption is confirmed.
            </li>
            <li>
              Redemptions are final. Points spent on a voucher cannot be refunded,
              reversed, or exchanged for cash.
            </li>
            <li>
              Vouchers are subject to availability and their points value may change or
              be withdrawn without prior notice.
            </li>
            <li>
              A redeemed voucher is valid only for your account and may not be sold,
              transferred, or shared.
            </li>
            <li>
              Your redemption receipt (PDF) is your proof of purchase &mdash; please keep
              it for your records.
            </li>
            <li>
              CartRedeem may cancel any redemption obtained through fraud, error, or
              misuse of the platform.
            </li>
          </ol>

          <p className="terms-modal__note">
            By confirming a redemption you agree to these terms.
          </p>
        </div>

        <div className="terms-modal__footer">
          <button type="button" className="terms-modal__done" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsModal;
