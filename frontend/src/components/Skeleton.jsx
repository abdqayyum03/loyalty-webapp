/** A single shimmering block. Pass width/height via style or a modifier class. */
export const Skeleton = ({ className = '', style }) => (
  <span className={`skeleton ${className}`} style={style} aria-hidden="true" />
);

/** One voucher card placeholder — mirrors VoucherCard's image + body layout. */
export const VoucherCardSkeleton = () => (
  <div className="voucher-card voucher-card--skeleton" aria-hidden="true">
    <div className="voucher-card__image-wrap">
      <Skeleton className="skeleton--fill" />
    </div>
    <div className="voucher-card__body">
      <div className="voucher-card__header">
        <Skeleton className="skeleton--line" style={{ width: '62%', height: 18 }} />
        <Skeleton className="skeleton--icon" />
      </div>
      <Skeleton className="skeleton--line" style={{ width: '100%' }} />
      <Skeleton className="skeleton--line" style={{ width: '88%' }} />
      <Skeleton className="skeleton--line" style={{ width: '40%', marginBottom: 16 }} />
      <Skeleton className="skeleton--btn" />
    </div>
  </div>
);

/** A grid of voucher-card placeholders. */
export const VoucherGridSkeleton = ({ count = 6 }) => (
  <div className="voucher-grid">
    {Array.from({ length: count }, (_, i) => (
      <VoucherCardSkeleton key={i} />
    ))}
  </div>
);

/** One cart-row placeholder — mirrors Cart's image + body layout. */
export const CartItemSkeleton = () => (
  <div className="cart__item" aria-hidden="true">
    <div className="cart__item-image-wrap">
      <Skeleton className="skeleton--fill" />
    </div>
    <div className="cart__item-body">
      <Skeleton className="skeleton--line" style={{ width: '30%', height: 14 }} />
      <Skeleton className="skeleton--line" style={{ width: '70%', height: 20 }} />
      <Skeleton className="skeleton--line" style={{ width: '100%' }} />
      <Skeleton className="skeleton--line" style={{ width: '50%' }} />
      <div className="cart__item-foot">
        <Skeleton className="skeleton--line" style={{ width: 90, height: 14 }} />
        <Skeleton className="skeleton--line" style={{ width: 70, height: 20 }} />
      </div>
    </div>
  </div>
);

/** A list of cart-row placeholders. */
export const CartListSkeleton = ({ count = 3 }) => (
  <div className="cart__list">
    {Array.from({ length: count }, (_, i) => (
      <CartItemSkeleton key={i} />
    ))}
  </div>
);

export default Skeleton;
