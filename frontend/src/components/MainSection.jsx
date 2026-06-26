import { getCurrentUser } from '../api/auth';

const MainSection = () => {
  // Greet the signed-in user by name (falls back gracefully if missing).
  const user = getCurrentUser();
  const rawName = user?.username || 'there';
  // Always show the name with an uppercase first letter, even if the user
  // signed up in all lowercase (e.g. "afham" → "Afham").
  const username = rawName.charAt(0).toUpperCase() + rawName.slice(1);

  return (
    <section className="hero">
      {/* Decorative gradient overlay */}
      <div className="hero__gradient" />

      {/* Left: promotional banner image (drop your artwork at public/hero-banner.png) */}
      <div className="hero__media">
        <img
          className="hero__image"
          src={`${process.env.PUBLIC_URL}/cartredeem_hero@2x.png`}
          alt="Gifts and freebies waiting to be redeemed"
        />
      </div>

      {/* Right: personalised welcome copy */}
      <div className="hero__copy">
        <h1 className="text-headline-lg-mobile hero__title">
          Welcome <span className="hero__name">{username}</span> to
          CartRedeem Portal 
        </h1>

        <p className="text-body-lg hero__subtitle">
          Redeem seamlessly and securely with our Voucher Platform
          platform.
        </p>
      </div>
    </section>
  );
};

export default MainSection;
