import { useState } from 'react';
import {
  sendRegistrationOtp,
  verifyRegistrationOtp,
  resendRegistrationOtp,
  getAuthErrorMessage,
} from '../api/auth';

/**
 * Create Account screen (email-verified).
 *
 * Two steps:
 *   1. Collect full name, email and password and ask the backend to email a
 *      verification code. NO account is created yet — the backend only stashes
 *      the pending details.
 *   2. The user enters the code; the backend verifies it and only THEN creates
 *      the account in MongoDB (password hashed by the backend). Control is then
 *      handed back to the parent so it can return to Login for sign-in.
 *
 * @param {{
 *   onSuccess?: (info: { email: string }) => void,  // account created
 *   onSignIn?: () => void,                           // "Sign In" link
 * }} props
 */
const SignUp = ({ onSuccess, onSignIn }) => {
  const [fullName, setFullName]               = useState('');
  const [email, setEmail]                     = useState('');
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError]                     = useState('');
  const [busy, setBusy]                       = useState(false);

  // Two-step signup: 'form' collects details, 'otp' verifies the emailed code.
  const [step, setStep]                       = useState('form');
  const [otp, setOtp]                         = useState('');
  const [info, setInfo]                       = useState('');   // status banner
  const [resending, setResending]             = useState(false);

  // Step 1 — validate, then ask the backend to email a code. No account yet.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side validation before hitting the backend.
    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Please fill in all the fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      const data = await sendRegistrationOtp({
        email: email.trim(),
        password,
        username: fullName.trim(),
      });
      setInfo(data.message || 'We sent a verification code to your email.');
      setStep('otp');
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  // Step 2 — confirm the code. This is what actually creates the account.
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');

    if (!otp.trim()) {
      setError('Please enter the 6-digit code from your email.');
      return;
    }

    setBusy(true);
    try {
      await verifyRegistrationOtp({ email: email.trim(), otp: otp.trim() });
      // Account created — hand back to the parent (returns to Login with a notice).
      onSuccess?.({ email: email.trim() });
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setInfo('');
    setResending(true);
    try {
      const data = await resendRegistrationOtp({ email: email.trim() });
      setInfo(data.message || 'A new code was sent to your email.');
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setResending(false);
    }
  };

  // Abandon code entry and go back to edit the details.
  const handleBackToForm = () => {
    setStep('form');
    setOtp('');
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
          <h1 className="text-headline-lg-mobile auth-title">CartRedeem</h1>
          <p className="text-body-md auth-subtitle">
            {step === 'otp'
              ? `Enter the verification code we sent to ${email.trim()}.`
              : 'Create an account to join the community of savvy redeemers.'}
          </p>
        </div>

        {step === 'otp' ? (
          /* ---------- Step 2: verification code ---------- */
          <form className="auth-form" onSubmit={handleVerifyOtp}>
            {info && (
              <p className="text-label-sm auth-notice" role="status">
                <span className="material-symbols-outlined auth-notice__icon" aria-hidden="true">
                  mail
                </span>
                {info}
              </p>
            )}

            <div className="auth-field">
              <label className="text-label-sm auth-label" htmlFor="otp">
                Verification Code
              </label>
              <div className="auth-input-wrap">
                <span className="material-symbols-outlined auth-input-icon" aria-hidden="true">
                  password
                </span>
                <input
                  id="otp"
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
              {busy ? 'Verifying…' : 'Verify & Create Account'}
            </button>

            <p className="text-label-sm auth-switch">Didn't get the code?</p>
            <button
              type="button"
              className="auth-secondary-btn text-label-sm"
              onClick={handleResendOtp}
              disabled={busy || resending}
            >
              {resending ? 'Sending…' : 'Resend Code'}
            </button>

            <button
              type="button"
              className="auth-switch-link text-label-sm"
              onClick={handleBackToForm}
              disabled={busy}
            >
              ← Back to edit details
            </button>
          </form>
        ) : (
        /* ---------- Step 1: account details ---------- */
        <form className="auth-form" onSubmit={handleSubmit}>
          {/* Full Name */}
          <div className="auth-field">
            <label className="text-label-sm auth-label" htmlFor="fullName">
              Full Name
            </label>
            <div className="auth-input-wrap">
              <span className="material-symbols-outlined auth-input-icon" aria-hidden="true">
                badge
              </span>
              <input
                id="fullName"
                name="fullName"
                type="text"
                className="auth-input"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                disabled={busy}
              />
            </div>
          </div>

          {/* Email Address */}
          <div className="auth-field">
            <label className="text-label-sm auth-label" htmlFor="email">
              Email Address
            </label>
            <div className="auth-input-wrap">
              <span className="material-symbols-outlined auth-input-icon" aria-hidden="true">
                mail
              </span>
              <input
                id="email"
                name="email"
                type="email"
                className="auth-input"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={busy}
              />
            </div>
          </div>

          {/* Password + Confirm Password */}
          <div className="auth-field-row">
            <div className="auth-field">
              <label className="text-label-sm auth-label" htmlFor="password">
                Password
              </label>
              <div className="auth-input-wrap">
                <input
                  id="password"
                  name="password"
                  type="password"
                  className="auth-input auth-input--bare"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={busy}
                />
              </div>
            </div>

            <div className="auth-field">
              <label className="text-label-sm auth-label" htmlFor="confirmPassword">
                Confirm Password
              </label>
              <div className="auth-input-wrap">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  className="auth-input auth-input--bare"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={busy}
                />
              </div>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <p className="text-label-sm auth-error" role="alert">
              <span className="material-symbols-outlined auth-error__icon" aria-hidden="true">
                error
              </span>
              {error}
            </p>
          )}

          {/* Primary action */}
          <button type="submit" className="auth-submit text-label-sm" disabled={busy}>
            {busy ? 'Sending code…' : 'Sign Up'}
          </button>

          {/* Switch to sign in */}
          <p className="text-label-sm auth-switch">
            Already have an account?{' '}
            <button
              type="button"
              className="auth-switch-link"
              onClick={() => onSignIn?.()}
              disabled={busy}
            >
              Sign In
            </button>
          </p>
        </form>
        )}
      </div>
    </main>
  );
};

export default SignUp;
