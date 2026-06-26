import { useState } from 'react';
import { adminLogin, getAdminErrorMessage } from '../../api/admin';

/**
 * Standalone admin sign-in screen. Reuses the same ticket-style auth card as the
 * customer login so the two feel like one product, with an "Admin" badge to make
 * the elevated context obvious.
 *
 * Only accounts whose role is 'admin' can authenticate here — the backend rejects
 * normal users with a 403, which surfaces as an inline error.
 *
 * @param {{
 *   notice?: string,                                  // info banner (e.g. after an idle logout)
 *   onSuccess?: (session: { token: string, user: object }) => void,
 * }} props
 */
const AdminLogin = ({ notice, onSuccess }) => {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState('');
  const [busy, setBusy]                 = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please enter your admin email and password.');
      return;
    }

    setBusy(true);
    try {
      const session = await adminLogin({ email: email.trim(), password });
      onSuccess?.(session);
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-main">
      <div className="auth-card">
        <span className="auth-card__perf auth-card__perf--left" aria-hidden="true" />
        <span className="auth-card__perf auth-card__perf--right" aria-hidden="true" />

        <div className="auth-header">
          <span className="admin-login-badge">
            <span className="material-symbols-outlined" aria-hidden="true">shield_person</span>
            Admin
          </span>
          <h1 className="text-headline-lg-mobile auth-title">CartRedeem Admin</h1>
          <p className="text-body-md auth-subtitle">
            Sign in to manage users, orders and rewards.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {/* Info notice (e.g. after an inactivity auto-logout) */}
          {notice && (
            <p className="text-label-sm auth-notice" role="status">
              <span className="material-symbols-outlined auth-notice__icon" aria-hidden="true">
                info
              </span>
              {notice}
            </p>
          )}

          {/* Email */}
          <div className="auth-field">
            <label className="text-label-sm auth-label" htmlFor="admin-email">
              Admin Email
            </label>
            <div className="auth-input-wrap">
              <span className="material-symbols-outlined auth-input-icon" aria-hidden="true">
                mail
              </span>
              <input
                id="admin-email"
                name="email"
                type="email"
                className="auth-input"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                disabled={busy}
              />
            </div>
          </div>

          {/* Password */}
          <div className="auth-field">
            <label className="text-label-sm auth-label" htmlFor="admin-password">
              Password
            </label>
            <div className="auth-input-wrap">
              <span className="material-symbols-outlined auth-input-icon" aria-hidden="true">
                lock
              </span>
              <input
                id="admin-password"
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
            {busy ? 'Signing in…' : 'Sign In to Dashboard'}
          </button>
        </form>
      </div>
    </main>
  );
};

export default AdminLogin;
