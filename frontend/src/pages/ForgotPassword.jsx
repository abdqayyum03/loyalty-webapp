import { useState } from 'react';
import {
  requestPasswordReset,
  resetPassword,
  getAuthErrorMessage,
} from '../api/auth';

/**
 * Forgot Password screen (email-verified reset).
 *
 * Two steps:
 *   1. Collect the account email and ask the backend to email a reset code.
 *   2. The user enters the code plus a new password; the backend verifies the
 *      code and updates the password. Control is then handed back to the parent
 *      so it can return to Login for sign-in.
 *
 * @param {{
 *   onSuccess?: (info: { email: string }) => void,  // password reset
 *   onBackToLogin?: () => void,                      // "Back to sign in" link
 * }} props
 */
const ForgotPassword = ({ onSuccess, onBackToLogin }) => {
  const [email, setEmail]                     = useState('');
  const [otp, setOtp]                         = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword]       = useState(false);

  const [error, setError]                     = useState('');
  const [info, setInfo]                       = useState('');   // status banner
  const [busy, setBusy]                       = useState(false);
  const [resending, setResending]             = useState(false);

  // Two-step flow: 'request' collects the email, 'reset' verifies the code.
  const [step, setStep]                       = useState('request');

  // Step 1 — ask the backend to email a reset code.
  const handleRequest = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setBusy(true);
    try {
      const data = await requestPasswordReset({ email: email.trim() });
      setInfo(data.message || 'We sent a reset code to your email.');
      setStep('reset');
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  // Step 2 — confirm the code and set the new password.
  const handleReset = async (e) => {
    e.preventDefault();
    setError('');

    if (!otp.trim()) {
      setError('Please enter the 6-digit code from your email.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      await resetPassword({ email: email.trim(), otp: otp.trim(), newPassword });
      // Password updated — hand back to the parent (returns to Login with a notice).
      onSuccess?.({ email: email.trim() });
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  // Re-request a code (the backend regenerates and re-emails it).
  const handleResend = async () => {
    setError('');
    setInfo('');
    setResending(true);
    try {
      const data = await requestPasswordReset({ email: email.trim() });
      setInfo(data.message || 'A new code was sent to your email.');
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setResending(false);
    }
  };

  // Abandon code entry and go back to edit the email.
  const handleBackToRequest = () => {
    setStep('request');
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setInfo('');
  };

  return (
    <main className="auth-main">
      <div className="auth-card">
        {/* Ticket perforation metaphor — side notches */}
        <span className="auth-card__perf auth-card__perf--left" aria-hidden="true" />
        <span className="auth-card__perf auth-card__perf--right" aria-hidden="true" />

        {/* Heading */}
        <div className="auth-header">
          <h1 className="text-headline-lg-mobile auth-title">Reset password</h1>
          <p className="text-body-md auth-subtitle">
            {step === 'reset'
              ? `Enter the reset code we sent to ${email.trim()} and choose a new password.`
              : "Enter your account email and we'll send you a reset code."}
          </p>
        </div>

        {step === 'reset' ? (
          /* ---------- Step 2: code + new password ---------- */
          <form className="auth-form" onSubmit={handleReset}>
            {info && (
              <p className="text-label-sm auth-notice" role="status">
                <span className="material-symbols-outlined auth-notice__icon" aria-hidden="true">
                  mail
                </span>
                {info}
              </p>
            )}

            <div className="auth-field">
              <label className="text-label-sm auth-label" htmlFor="reset-otp">
                Reset Code
              </label>
              <div className="auth-input-wrap">
                <span className="material-symbols-outlined auth-input-icon" aria-hidden="true">
                  password
                </span>
                <input
                  id="reset-otp"
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

            <div className="auth-field">
              <label className="text-label-sm auth-label" htmlFor="new-password">
                New Password
              </label>
              <div className="auth-input-wrap">
                <span className="material-symbols-outlined auth-input-icon" aria-hidden="true">
                  lock
                </span>
                <input
                  id="new-password"
                  name="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  className="auth-input auth-input--with-toggle"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={busy}
                />
                <button
                  type="button"
                  className="auth-input-toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((v) => !v)}
                  disabled={busy}
                >
                  <span className="material-symbols-outlined">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <div className="auth-field">
              <label className="text-label-sm auth-label" htmlFor="confirm-new-password">
                Confirm New Password
              </label>
              <div className="auth-input-wrap">
                <span className="material-symbols-outlined auth-input-icon" aria-hidden="true">
                  lock
                </span>
                <input
                  id="confirm-new-password"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  className="auth-input"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={busy}
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
              {busy ? 'Resetting…' : 'Reset Password'}
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
              onClick={handleBackToRequest}
              disabled={busy}
            >
              ← Use a different email
            </button>
          </form>
        ) : (
          /* ---------- Step 1: email ---------- */
          <form className="auth-form" onSubmit={handleRequest}>
            <div className="auth-field">
              <label className="text-label-sm auth-label" htmlFor="reset-email">
                Email Address
              </label>
              <div className="auth-input-wrap">
                <span className="material-symbols-outlined auth-input-icon" aria-hidden="true">
                  mail
                </span>
                <input
                  id="reset-email"
                  name="email"
                  type="email"
                  className="auth-input"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
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
              {busy ? 'Sending code…' : 'Send Reset Code'}
            </button>

            <button
              type="button"
              className="auth-switch-link text-label-sm"
              onClick={() => onBackToLogin?.()}
              disabled={busy}
            >
              ← Back to sign in
            </button>
          </form>
        )}
      </div>
    </main>
  );
};

export default ForgotPassword;
