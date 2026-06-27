import { useEffect, useState } from 'react';
import { getMe, getCurrentUser } from '../api/auth';
import RedemptionHistory from '../components/RedemptionHistory';

const formatPoints = (n) => Number(n || 0).toLocaleString();

// "March 2022" — the month/year the account was created.
const formatMemberSince = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

// Capitalise the first letter so "afham" shows as "Afham".
const toDisplayName = (name) =>
  name ? name.charAt(0).toUpperCase() + name.slice(1) : 'there';

/**
 * Read-only account profile. Seeds instantly from the cached session, then
 * refreshes the live values (points, etc.) from MongoDB via GET /api/auth/me —
 * the same pattern the Points page uses.
 *
 * The backend only exposes name, email, points and the join date, so we show
 * those for real and use honest empty states for activity rather than faking
 * redemption history.
 *
 * @param {{ user?: object, onNavigate?: (page: string) => void }} props
 */
const Profile = ({ user: initialUser, onNavigate }) => {
  // Seed from the app's current user (or the cached session) so the page
  // renders immediately…
  const [user, setUser] = useState(() => initialUser ?? getCurrentUser());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // …then refresh with the exact, up-to-date values straight from MongoDB.
  useEffect(() => {
    let active = true;

    getMe()
      .then((fresh) => {
        if (active) {
          setUser(fresh);
          setError('');
        }
      })
      .catch(() => {
        if (active) {
          setError('Could not refresh from the server — showing your last saved details.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const displayName = toDisplayName(user?.username);
  const initial = displayName.charAt(0).toUpperCase();
  const email = user?.email || '—';
  const phone = user?.phone || '';
  const avatar = user?.avatar || '';
  const points = user?.points ?? 0;
  const memberSince = formatMemberSince(user?.createdAt);

  return (
    <main className="main-content container-max page-px">
      <div className="profile">

        {/* Identity header */}
        <section className="profile-header">
          <div
            className={`profile-header__avatar${avatar ? ' profile-header__avatar--img' : ''}`}
            aria-hidden="true"
          >
            {avatar ? <img src={avatar} alt="" /> : initial}
          </div>

          <div className="profile-header__identity">
            <h1 className="text-headline-lg profile-header__name">{displayName}</h1>
            <p className="profile-header__email">{email}</p>
            <p className="profile-header__meta">
              <span className="material-symbols-outlined">calendar_month</span>
              Member since {memberSince}
            </p>
          </div>

          <div className="profile-header__stat">
            <p className="text-label-sm profile-header__stat-label">Points Balance</p>
            <p className="profile-header__stat-value">
              {loading && !user ? '—' : formatPoints(points)}
            </p>
          </div>
        </section>

        {/* Non-blocking notice if the live refresh failed */}
        {error && (
          <p className="profile__notice text-label-sm" role="status">
            <span className="material-symbols-outlined">info</span>
            {error}
          </p>
        )}

        <div className="profile-grid">

          {/* Account details — every field below is real, from the backend */}
          <section className="profile-card">
            <h2 className="text-headline-md profile-card__title">Account Details</h2>
            <ul className="profile-details">
              <li className="profile-detail">
                <span className="material-symbols-outlined profile-detail__icon">person</span>
                <div className="profile-detail__text">
                  <p className="text-label-sm profile-detail__label">Full Name</p>
                  <p className="profile-detail__value">{displayName}</p>
                </div>
              </li>
              <li className="profile-detail">
                <span className="material-symbols-outlined profile-detail__icon">mail</span>
                <div className="profile-detail__text">
                  <p className="text-label-sm profile-detail__label">Email Address</p>
                  <p className="profile-detail__value">{email}</p>
                </div>
              </li>
              <li className="profile-detail">
                <span className="material-symbols-outlined profile-detail__icon">call</span>
                <div className="profile-detail__text">
                  <p className="text-label-sm profile-detail__label">Phone Number</p>
                  <p className="profile-detail__value">
                    {phone || <span className="profile-detail__muted">Not set</span>}
                  </p>
                </div>
              </li>
              <li className="profile-detail">
                <span className="material-symbols-outlined profile-detail__icon">stars</span>
                <div className="profile-detail__text">
                  <p className="text-label-sm profile-detail__label">Points Balance</p>
                  <p className="profile-detail__value">{formatPoints(points)} pts</p>
                </div>
              </li>
              <li className="profile-detail">
                <span className="material-symbols-outlined profile-detail__icon">calendar_month</span>
                <div className="profile-detail__text">
                  <p className="text-label-sm profile-detail__label">Member Since</p>
                  <p className="profile-detail__value">{memberSince}</p>
                </div>
              </li>
            </ul>

            <button
              type="button"
              className="profile-action profile-action--primary profile-card__edit"
              onClick={() => onNavigate?.('edit-profile')}
            >
              <span className="material-symbols-outlined">edit</span>
              Edit Account Details
            </button>
          </section>

          {/* Activity — live voucher redemptions from /api/orders/history. */}
          <section className="profile-card">
            <h2 className="text-headline-md profile-card__title">Voucher Activity</h2>

            <RedemptionHistory
              limit={5}
              emptyText="No redemptions yet. Browse vouchers to redeem your first reward."
            />

            <div className="profile-actions">
              <button
                type="button"
                className="profile-action profile-action--primary"
                onClick={() => onNavigate?.('products')}
              >
                <span className="material-symbols-outlined">redeem</span>
                Browse Vouchers
              </button>
              <button
                type="button"
                className="profile-action"
                onClick={() => onNavigate?.('points')}
              >
                <span className="material-symbols-outlined">stars</span>
                View Points
              </button>
            </div>
          </section>

        </div>
      </div>
    </main>
  );
};

export default Profile;
