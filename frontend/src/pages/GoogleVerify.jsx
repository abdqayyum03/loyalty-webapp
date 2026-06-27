import { useState } from 'react';
import {
  verifyGoogleOtp,
  resendRegistrationOtp,
  getAuthErrorMessage,
} from '../api/auth';

/**
 * First-time "Login with Google" verification screen.
 *
 * Reached after the backend redirects to
 * "/auth/google/success?otp=required&email=…" — i.e. a brand-new Google user
 * whose account has NOT been created yet. The backend has emailed a one-time
 * code; entering it here verifies the address, creates the account and logs the
 * user in. Returning Google users never see this — they're logged straight in.
 *
 * @param {{
 *   email: string,                                       // address the code went to
 *   onSuccess?: (session: { token: string, user: object }) => void,
 *   onCancel?: () => void,                               // back to Login
 * }} props
 */
const GoogleVerify = ({ email, onSuccess, onCancel }) => {
  const [otp, setOtp]             = useState('');
  const [error, setError]         = useState('');
  const [info, setInfo]           = useState(
    `We sent a verification code to ${email}.`
  );
  const [busy, setBusy]           = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');

    if (!otp.trim()) {
      setError('Please enter the 6-digit code from your email.');
      return;
    }

    setBusy(true);
    try {
      const session = await verifyGoogleOtp({ email, otp: otp.trim() });
      onSuccess?.(session);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setInfo('');
    setResending(true);
    try {
      const data = await resendRegistrationOtp({ email });
      setInfo(data.message || 'A new code was sent to your email.');
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="auth-main">
      <div className="auth-card">
        {/* Ticket perforation metaphor — side notches */}
        <span className="auth-card__perf auth-card__perf--left" aria-hidden="true" />
        <span className="auth-card__perf auth-card__perf--right" aria-hidden="true" />

        {/* Heading */}
        <div className="auth-header">
          <h1 className="text-headline-lg-mobile auth-title">Verify your email</h1>
          <p className="text-body-md auth-subtitle">
            First time with Google — confirm the code to finish creating your account.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleVerify}>
          {info && (
            <p className="text-label-sm auth-notice" role="status">
              <span className="material-symbols-outlined auth-notice__icon" aria-hidden="true">
                mail
              </span>
              {info}
            </p>
          )}

          <div className="auth-field">
            <label className="text-label-sm auth-label" htmlFor="google-otp">
              Verification Code
            </label>
            <div className="auth-input-wrap">
              <span className="material-symbols-outlined auth-input-icon" aria-hidden="true">
                password
              </span>
              <input
                id="google-otp"
                name="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                className="auth-input"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                disabled={busy}
                autoFocus
              />
            </div>
          </div>

          {error && (
            <p className="text-label-sm auth-error" role="alert">
              <span className="material-symbols-outlined auth-error__icon" aria-hidden="true">
                error
              </span>
              {error}
            </p>
          )}

          <button type="submit" className="auth-submit text-label-sm" disabled={busy}>
            {busy ? 'Verifying…' : 'Verify & Continue'}
          </button>

          <p className="text-label-sm auth-switch">Didn't get the code?</p>
          <button
            type="button"
            className="auth-secondary-btn text-label-sm"
            onClick={handleResend}
            disabled={busy || resending}
          >
            {resending ? 'Sending…' : 'Resend Code'}
          </button>

          <button
            type="button"
            className="auth-switch-link text-label-sm"
            onClick={() => onCancel?.()}
            disabled={busy}
          >
            ← Back to sign in
          </button>
        </form>
      </div>
    </main>
  );
};

export default GoogleVerify;
