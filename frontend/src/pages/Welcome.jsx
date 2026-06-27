import { useEffect, useRef } from 'react';
import './Welcome.css';

/**
 *
 * @param {{
 *   onGetStarted?: () => void,  // primary CTA → Create Account
 *   onSignIn?: () => void,      // secondary CTA → Login
 * }} props
 */

const Welcome = ({ onGetStarted, onSignIn }) => {
  const rootRef = useRef(null);

  // Reveal-on-scroll: elements tagged `data-reveal` fade/slide in as they
  // enter the viewport. The `.wel--reveal-ready` flag is only added here, so
  // the page degrades to fully visible if scripting is unavailable.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const targets = root.querySelectorAll('[data-reveal]');
    if (!targets.length) return undefined;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('is-visible'));
      return undefined;
    }

    root.classList.add('wel--reveal-ready');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' }
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id) => (e) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const icon = (name, fill = false) => (
    <span
      className="material-symbols-outlined"
      style={fill ? { fontVariationSettings: "'FILL' 1" } : undefined}
      aria-hidden="true"
    >
      {name}
    </span>
  );

  return (
    <div className="wel" ref={rootRef}>
      {/* ---------------- Top bar ---------------- */}
      <header className="wel-nav">
        <div className="wel-nav__inner">
          <button type="button" className="wel-brand" onClick={scrollTo('wel-top')}>
            {icon('confirmation_number', true)}
            CartRedeem
          </button>

          <nav className="wel-nav__links">
            <button type="button" className="wel-nav__link" onClick={scrollTo('overview')}>Overview</button>
            <button type="button" className="wel-nav__link" onClick={scrollTo('mission')}>Mission</button>
            <button type="button" className="wel-nav__link" onClick={scrollTo('roadmap')}>Roadmap</button>
            <button type="button" className="wel-nav__link" onClick={scrollTo('learning')}>Learning</button>
          </nav>

          <div className="wel-nav__actions">
            <button type="button" className="wel-link-btn" onClick={() => onSignIn?.()}>
              Sign In
            </button>
            <button type="button" className="wel-btn wel-btn--primary wel-btn--sm" onClick={() => onGetStarted?.()}>
              Get Started
            </button>
          </div>
        </div>
      </header>

      <main id="wel-top">
        {/* ---------------- Hero ---------------- */}
        <section className="wel-hero">
          <div className="wel-hero__copy">
            <span className="wel-badge">
              {icon('school')}
              MERN CAPSTONE PROJECT
            </span>

            <h1 className="wel-hero__title">
              Welcome to <span className="wel-accent">CartRedeem</span>
            </h1>

            <p className="wel-hero__subtitle">
              A full-stack MERN application built for educational purposes. Developed as a Full Stack MERN 
              certificate by Knowledge.com, it serves as an end-to-end platform for discovering, saving, 
              and redeeming digital vouchers.
            </p>

            <div className="wel-hero__cta">
              <button type="button" className="wel-btn wel-btn--primary" onClick={() => onGetStarted?.()}>
                Get Started {icon('arrow_forward')}
              </button>
              <button type="button" className="wel-btn wel-btn--ghost" onClick={() => onSignIn?.()}>
                Sign In
              </button>
            </div>

            <div className="wel-trust">
              <span className="wel-trust__label">BUILT WITH</span>
              <div className="wel-trust__items">
                <span className="wel-trust__item">MongoDB</span>
                <span className="wel-trust__dot" aria-hidden="true">·</span>
                <span className="wel-trust__item">Express</span>
                <span className="wel-trust__dot" aria-hidden="true">·</span>
                <span className="wel-trust__item">React</span>
                <span className="wel-trust__dot" aria-hidden="true">·</span>
                <span className="wel-trust__item">Node.js</span>
              </div>
            </div>
          </div>

          {/* Hero visual — a stylised voucher mock on a gradient panel */}
          <div className="wel-hero__visual" aria-hidden="true">
            <div className="wel-hero__panel">
              <div className="wel-ticket">
                <div className="wel-ticket__top">
                  <span className="wel-ticket__brand">{icon('redeem', true)} CartRedeem</span>
                  <span className="wel-ticket__pill">VOUCHER</span>
                </div>
                <div className="wel-ticket__value">RM 50.00</div>
                <div className="wel-ticket__label">Digital Reward Voucher</div>
                <div className="wel-ticket__perf" />
                <div className="wel-ticket__bottom">
                  <span className="wel-ticket__code">CR-2026-REDEEM</span>
                  <span className="wel-ticket__status">{icon('verified', true)} Verified</span>
                </div>
              </div>
              <div className="wel-hero__chip wel-hero__chip--points">
                {icon('stars', true)} +120 Points
              </div>
              <div className="wel-hero__chip wel-hero__chip--cart">
                {icon('shopping_cart', true)} Added to cart
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- Overview / what it does ---------------- */}
        <section id="overview" className="wel-section">
          <div className="wel-section__head" data-reveal>
            <span className="wel-eyebrow">HOW IT WORKS</span>
            <h2 className="wel-section__title">Bridging the redemption gap</h2>
            <p className="wel-section__lead">
              CartRedeem turns scattered promo codes and paper coupons into a single,
              secure digital experience making it effortless to discover offers and
              redeem them instantly, all from one account.
            </p>
          </div>

          <div className="wel-cards-3">
            <article className="wel-card" data-reveal>
              <span className="wel-card__icon">{icon('storefront')}</span>
              <h3 className="wel-card__title">Browse &amp; Collect</h3>
              <p className="wel-card__text">
                Explore a live catalogue of vouchers and add your favourites to a
                personal cart, ready to redeem whenever you like.
              </p>
            </article>

            <article className="wel-card" data-reveal style={{ '--reveal-delay': '0.1s' }}>
              <span className="wel-card__icon">{icon('verified_user')}</span>
              <h3 className="wel-card__title">Secure Redemption</h3>
              <p className="wel-card__text">
                Email-OTP verified accounts, hashed passwords, and Google sign-in keep
                every redemption protected from end to end.
              </p>
            </article>

            <article className="wel-card" data-reveal style={{ '--reveal-delay': '0.2s' }}>
              <span className="wel-card__icon">{icon('loyalty')}</span>
              <h3 className="wel-card__title">Points &amp; Rewards</h3>
              <p className="wel-card__text">
                Earn and track reward points with every action and unlock more value
                from the vouchers you redeem over time.
              </p>
            </article>
          </div>
        </section>

        {/* ---------------- Mission / goals (bento) ---------------- */}
        <section id="mission" className="wel-section">
          <div className="wel-section__head wel-section__head--left" data-reveal>
            <span className="wel-eyebrow">OUR NORTH STAR</span>
            <h2 className="wel-section__title">Core mission &amp; goals</h2>
            <p className="wel-section__lead wel-section__lead--left">
              Three principles guide the build; so every redemption feels fast,
              friendly, and trustworthy.
            </p>
          </div>

          <div className="wel-bento">
            <article className="wel-bento__cell wel-bento__cell--feature" data-reveal>
              <h3 className="wel-bento__title">Accessibility {icon('accessibility_new')}</h3>
              <p className="wel-bento__text">
                Built for everyone. Responsive layouts, a one-tap dark mode, and clear,
                keyboard-friendly forms work flawlessly across every device.
              </p>
              <ul className="wel-bento__list">
                <li>{icon('check_circle')} Fully responsive design</li>
                <li>{icon('check_circle')} Light &amp; dark themes</li>
                <li>{icon('check_circle')} Accessible, labelled forms</li>
              </ul>
            </article>

            <article className="wel-bento__cell wel-bento__cell--primary" data-reveal style={{ '--reveal-delay': '0.08s' }}>
              <span className="wel-bento__kicker">Efficiency</span>
              <p className="wel-bento__copy">
                Redeeming shouldn't take more than a moment. Carts and points update
                the instant you act.
              </p>
              <div className="wel-bento__stat">1-Tap</div>
              <div className="wel-bento__statlabel">AVERAGE REDEEM FLOW</div>
            </article>

            <article className="wel-bento__cell wel-bento__cell--tertiary" data-reveal style={{ '--reveal-delay': '0.16s' }}>
              <span className="wel-bento__kicker">Satisfaction</span>
              <p className="wel-bento__copy">
                Simple, friendly flows make collecting and redeeming feel genuinely
                rewarding not like work.
              </p>
            </article>

            <article className="wel-bento__cell wel-bento__cell--security" data-reveal style={{ '--reveal-delay': '0.24s' }}>
              <p className="wel-bento__copy">
                Every account is protected with hashed passwords, email OTP
                verification, and secure Google sign-in.
              </p>
              <span className="wel-bento__code">CR-OTP-VERIFIED</span>
            </article>
          </div>
        </section>

        {/* ---------------- Roadmap / future improvements ---------------- */}
        <section id="roadmap" className="wel-roadmap">
          <div className="wel-roadmap__inner">
            <div className="wel-section__head" data-reveal>
              <h2 className="wel-section__title wel-section__title--invert">The roadmap ahead</h2>
              <p className="wel-section__lead wel-section__lead--invert">
                This capstone is just the foundation. Here's what's planned next for
                the CartRedeem experience.
              </p>
            </div>

            <ol className="wel-timeline">
              <li className="wel-timeline__item" data-reveal>
                <span className="wel-timeline__phase">UP NEXT</span>
                <div className="wel-timeline__dot">{icon('install_mobile')}</div>
                <h3 className="wel-timeline__title">Mobile-first PWA</h3>
                <p className="wel-timeline__text">
                  An installable progressive web app with offline access to your saved
                  vouchers, so rewards travel with you.
                </p>
              </li>

              <li className="wel-timeline__item" data-reveal style={{ '--reveal-delay': '0.1s' }}>
                <span className="wel-timeline__phase">ON THE HORIZON</span>
                <div className="wel-timeline__dot">{icon('auto_awesome')}</div>
                <h3 className="wel-timeline__title">Smart recommendations</h3>
                <p className="wel-timeline__text">
                  AI-assisted voucher suggestions based on your redemption history and
                  interests, curated for each user.
                </p>
              </li>

              <li className="wel-timeline__item" data-reveal style={{ '--reveal-delay': '0.2s' }}>
                <span className="wel-timeline__phase">FUTURE VISION</span>
                <div className="wel-timeline__dot">{icon('hub')}</div>
                <h3 className="wel-timeline__title">Blockchain loyalty points</h3>
                <p className="wel-timeline__text">
                  Tamper-proof, transferable reward points recorded on-chain for full
                  transparency and tradeability.
                </p>
              </li>
            </ol>
          </div>
        </section>

        {/* ---------------- CTA ---------------- */}
        <section className="wel-cta">
          <div className="wel-cta__panel" data-reveal>
            <h2 className="wel-cta__title">Ready to start redeeming?</h2>
            <p className="wel-cta__text">
              Create your free account and explore the full CartRedeem experience —
              browse vouchers, build your cart, and watch your points grow.
            </p>
            <button type="button" className="wel-btn wel-btn--invert" onClick={() => onGetStarted?.()}>
              Get Started for Free {icon('arrow_forward')}
            </button>
          </div>
        </section>

        {/* ---------------- Learning note ---------------- */}
        <section id="learning" className="wel-learning" data-reveal>
          <span className="wel-learning__icon">{icon('school', true)}</span>
          <div>
            <h3 className="wel-learning__title">A learning project</h3>
            <p className="wel-learning__text">
              CartRedeem was built for educational purposes as the capstone project of
              the Full-Stack MERN certificate by Knowledge.com. It demonstrates a
              complete MongoDB · Express · React · Node.js application, from
              authentication to redemption.
            </p>
          </div>
        </section>
      </main>

      {/* ---------------- Footer ---------------- */}
      <footer className="wel-footer">
        <div className="wel-footer__inner">
          <div className="wel-footer__brand">
            <span className="wel-brand wel-brand--static">
              {icon('confirmation_number', true)}
              CartRedeem
            </span>
            <p className="wel-footer__copy">
              © 2026 CartRedeem — a learning project. Precise. Dependable. Rewarding.
            </p>
          </div>

          <nav className="wel-footer__links">
            <button type="button" className="wel-footer__link" onClick={scrollTo('overview')}>Overview</button>
            <button type="button" className="wel-footer__link" onClick={scrollTo('mission')}>Mission</button>
            <button type="button" className="wel-footer__link" onClick={scrollTo('roadmap')}>Roadmap</button>
            <button type="button" className="wel-footer__link" onClick={() => onSignIn?.()}>Sign In</button>
          </nav>
        </div>
      </footer>
    </div>
  );
};

export default Welcome;
