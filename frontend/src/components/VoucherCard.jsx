/**
 * @param {{
 *   image: string,
 *   imageAlt: string,
 *   badge: 'VALID' | 'EXPIRING' | 'EXPIRED',
 *   title: string,
 *   description: string,
 *   icon: string,
 *   validUntil?: string,
 *   onExplore: () => void,
 * }} props
 */

// Badge label → modifier class (falls back to the "valid" look).
const BADGE_CLASS = {
  VALID: 'voucher-card__badge--valid',
  EXPIRING: 'voucher-card__badge--expiring',
  EXPIRED: 'voucher-card__badge--expired',
};

const VoucherCard = ({ image, imageAlt, badge, title, description, icon, validUntil, onExplore }) => {
  const badgeClass = `voucher-card__badge ${BADGE_CLASS[badge] || BADGE_CLASS.VALID}`;
  const expired = badge === 'EXPIRED';

  return (
    <div className={`voucher-card${expired ? ' voucher-card--expired' : ''}`}>
      {/* Card image */}
      <div className="voucher-card__image-wrap">
        <img src={image} alt={imageAlt} className="voucher-card__image" />
        <div className={badgeClass}>{badge}</div>
      </div>

      {/* Card body with ticket-notch effect */}
      <div className="voucher-card__body">
        <div className="voucher-card__header">
          <h3 className="voucher-card__title">{title}</h3>
          <span className="material-symbols-outlined voucher-card__icon">{icon}</span>
        </div>
        <p className="voucher-card__desc">{description}</p>

        {/* Validity line */}
        {validUntil && (
          <p className={`voucher-card__valid${expired ? ' voucher-card__valid--expired' : ''}`}>
            <span className="material-symbols-outlined">
              {expired ? 'event_busy' : 'schedule'}
            </span>
            {validUntil === 'No expiry listed'
              ? 'No expiry date'
              : `${expired ? 'Expired on' : 'Valid until'} ${validUntil}`}
          </p>
        )}

        <button className="voucher-card__cta" onClick={onExplore}>
          Explore{' '}
          <span className="material-symbols-outlined">open_in_new</span>
        </button>
      </div>
    </div>
  );
};

export default VoucherCard;
