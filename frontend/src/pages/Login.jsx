import { useState } from 'react';
import { login, getAuthErrorMessage, GOOGLE_LOGIN_URL } from '../api/auth';

/**
 * Standalone authentication screen (centered ticket-style card).
 *
 * Authenticates against the backend — only users that already have an account
 * (with the correct password) can sign in. "Create Account" navigates to the
 * dedicated Sign Up screen.
 *
 * @param {{
 *   notice?: string,                                  // success banner (e.g. after sign up)
 *   onSuccess?: (session: { token: string, user: object }) => void,
 *   onCreateAccount?: () => void,
 *   onForgotPassword?: () => void,
 * }} props
 */
const Login = ({ notice, onSuccess, onCreateAccount, onForgotPassword }) => {
  const [identifier, setIdentifier]   = useState('');
  const [password, setPassword]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]             = useState('');
  const [busy, setBusy]               = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim() || !password) {
      setError('Please enter your email/username and password.');
      return;
    }

    setBusy(true);
    try {
      const session = await login({ identifier: identifier.trim(), password });
      onSuccess?.(session);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setBusy(false);
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
          <h1 className="text-headline-lg-mobile auth-title">CartRedeem</h1>
          <p className="text-body-md auth-subtitle">
            Sign in to redeem and manage vouchers securely.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {/* Success notice (e.g. after creating an account) */}
          {notice && (
            <p className="text-label-sm auth-notice" role="status">
              <span className="material-symbols-outlined auth-notice__icon" aria-hidden="true">
                check_circle
              </span>
              {notice}
            </p>
          )}

          {/* Email / Username */}
          <div className="auth-field">
            <label className="text-label-sm auth-label" htmlFor="identifier">
              Email or Username
            </label>
            <div className="auth-input-wrap">
              <span className="material-symbols-outlined auth-input-icon" aria-hidden="true">
                person
              </span>
              <input
                id="identifier"
                name="identifier"
                type="text"
                className="auth-input"
                placeholder="user@example.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                disabled={busy}
              />
            </div>
          </div>

          {/* Password */}
          <div className="auth-field">
            <label className="text-label-sm auth-label" htmlFor="password">
              Password
            </label>
            <div className="auth-input-wrap">
              <span className="material-symbols-outlined auth-input-icon" aria-hidden="true">
                lock
              </span>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                className="auth-input auth-input--with-toggle"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
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

            <div className="auth-forgot-row">
              <button
                type="button"
                className="text-label-sm auth-forgot"
                onClick={() => onForgotPassword?.()}
                disabled={busy}
              >
                Forgot password?
              </button>
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
            {busy ? 'Signing in…' : 'Sign In'}
          </button>

          {/* Create account → dedicated Sign Up screen */}
          <p className="text-label-sm auth-switch">Don't have an account?</p>
          <button
            type="button"
            className="auth-secondary-btn text-label-sm"
            onClick={() => onCreateAccount?.()}
            disabled={busy}
          >
            Create Account
          </button>

          {/* Divider */}
          <div className="auth-divider">
            <span className="auth-divider__line" />
            <span className="text-label-sm auth-divider__text">or</span>
            <span className="auth-divider__line" />
          </div>

          {/* Google sign-in — hand off to the backend OAuth flow. This is a
              full-page navigation; Google redirects back to
              /auth/google/success?token=… which App.js consumes. */}
          <button
            type="button"
            className="auth-secondary-btn auth-google-btn text-label-sm"
            onClick={() => { window.location.href = GOOGLE_LOGIN_URL; }}
            disabled={busy}
          >
            <svg className="auth-google-btn__icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Login with Google
          </button>
        </form>
      </div>
    </main>
  );
};

export default Login;
