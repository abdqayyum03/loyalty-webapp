import { useState } from 'react';
import TermsModal from './termncondition';
import ContactModal from './contactus';

const Footer = () => {
  const [termsOpen, setTermsOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <footer className="footer">
      <div className="footer__inner container-max page-px">

        {/* Brand + copyright */}
        <div className="footer__brand">
          <span className="footer__brand-name">
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              confirmation_number
            </span>
            CartRedeem
          </span>
          <p className="footer__copy">© 2024 CartRedeem Inc. All rights reserved.</p>
        </div>

        {/* Nav links */}
        <div className="footer__links-wrap">
          <nav className="footer__links">
            <button
              type="button"
              className="footer-link footer-link--button"
              onClick={() => setTermsOpen(true)}
            >
              Terms &amp; Conditions
            </button>
            <button
              type="button"
              className="footer-link footer-link--button"
              onClick={() => setContactOpen(true)}
            >
              Contact Us
            </button>
          </nav>
        </div>

      </div>

      <TermsModal open={termsOpen} onClose={() => setTermsOpen(false)} />
      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
    </footer>
  );
};

export default Footer;