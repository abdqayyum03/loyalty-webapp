import { useEffect, useState } from 'react';
import { getMe, getCurrentUser } from '../api/auth';
import RedemptionHistory from '../components/RedemptionHistory';

const formatPoints = (n) => Number(n || 0).toLocaleString();

// Static program info (no backing collection — these are the earning rules).
const EARN_WAYS = [
  {
    icon: 'group_add',
    title: 'Refer a Friend',
    desc: 'Get 500 points for every friend who signs up and redeems a voucher.',
  },
  {
    icon: 'storefront',
    title: 'Partner Purchases',
    desc: 'Shop at participating retailers and earn up to 5x points.',
  },
];

/**
 * Points dashboard. The balance is read live from the database via GET
 * /api/auth/me; the cached session value is used as an instant first paint.
 *
 * @param {{ onRedeem?: () => void }} props
 */
const Points = ({ onRedeem }) => {
  // Seed from the cached session so the balance renders immediately…
  const [user, setUser] = useState(() => getCurrentUser());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // …then refresh with the exact value straight from MongoDB.
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
          setError('Could not refresh from the server — showing your last known balance.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const points = user?.points ?? 0;

  return (
    <main className="main-content container-max page-px">
      <div className="points-dashboard">

        {/* Balance summary */}
        <section className="points-summary">
          <div className="points-summary__info">
            <p className="text-label-sm points-summary__label">Total Points Balance</p>
            <p className="points-summary__amount">
              <span className="points-summary__value">
                {loading && !user ? '—' : formatPoints(points)}
              </span>
              <span className="points-summary__unit">Points</span>
            </p>
          </div>

          <button
            type="button"
            className="points-summary__redeem"
            onClick={() => onRedeem?.()}
          >
            <span className="material-symbols-outlined">redeem</span>
            Redeem Points
          </button>
        </section>

        {/* Non-blocking notice if the live refresh failed */}
        {error && (
          <p className="points-dashboard__notice text-label-sm" role="status">
            <span className="material-symbols-outlined">info</span>
            {error}
          </p>
        )}

        <div className="points-grid">

          {/* Points history — live voucher redemptions from /api/orders/history. */}
          <section className="points-history">
            <h2 className="text-headline-md points-history__title">Points History</h2>
            <RedemptionHistory emptyText="No activity yet. Redeem a voucher to start building your history." />
          </section>

          {/* Ways to earn */}
          <section className="points-earn">
            <h2 className="text-headline-md points-earn__title">Ways to Earn</h2>
            {EARN_WAYS.map((way) => (
              <div className="points-earn__card" key={way.title}>
                <span className="material-symbols-outlined points-earn__icon">
                  {way.icon}
                </span>
                <div>
                  <p className="text-body-md points-earn__name">{way.title}</p>
                  <p className="text-label-sm points-earn__desc">{way.desc}</p>
                </div>
              </div>
            ))}
          </section>

        </div>
      </div>
    </main>
  );
};

export default Points;
