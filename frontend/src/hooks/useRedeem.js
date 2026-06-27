import { useState } from 'react';
import { downloadOrderReceipt, getCartErrorMessage } from '../api/cart';

/**
 * Shared redemption flow used by both the cart ("Redeem All") and a single
 * voucher ("Redeem Now"). Drives the loading → success / error modal and lets
 * the user download a receipt PDF per redeemed voucher.
 *
 * @param {{ onSuccess?: () => void }} [options] - called after a successful
 *   redemption's modal is closed (e.g. to refresh the cart or points balance).
 */
export const useRedeem = ({ onSuccess } = {}) => {
  // 'idle' (no modal) | 'loading' | 'success' | 'error'
  const [state, setState] = useState('idle');
  const [result, setResult] = useState(null); // orderDetails on success
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState(''); // machine code, e.g. VOUCHER_EXPIRED
  const [downloadingId, setDownloadingId] = useState(null); // receipt in flight

  /**
   * Start a redemption. Pass a factory that returns the API promise — e.g.
   * `run(() => checkout())` or `run(() => redeemVoucher(id))`.
   */
  const run = (redeemRequest) => {
    if (state === 'loading') return;
    setState('loading');
    setError('');
    setErrorCode('');

    redeemRequest()
      .then((data) => {
        setResult(data.orderDetails);
        setState('success');
      })
      .catch((err) => {
        setError(getCartErrorMessage(err));
        setErrorCode(err?.response?.data?.code || '');
        setState('error');
      });
  };

  /**
   * Surface an error modal directly, without an API call — used when the client
   * already knows the redemption can't proceed (e.g. an expired voucher).
   */
  const fail = (message, code = '') => {
    if (state === 'loading') return;
    setError(message);
    setErrorCode(code);
    setState('error');
  };

  // Save a single order's receipt PDF (generated on demand by the backend).
  const downloadReceipt = (orderId) => {
    setDownloadingId(orderId);
    downloadOrderReceipt(orderId)
      .catch(() => setError('Could not download that receipt. Please try again.'))
      .finally(() => setDownloadingId(null));
  };

  // Close the modal; run the success callback only if we just succeeded.
  const close = () => {
    const wasSuccess = state === 'success';
    setState('idle');
    setResult(null);
    setError('');
    setErrorCode('');
    if (wasSuccess) onSuccess?.();
  };

  return { state, result, error, errorCode, downloadingId, run, fail, downloadReceipt, close };
};
