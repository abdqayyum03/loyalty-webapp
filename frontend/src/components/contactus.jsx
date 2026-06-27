import { useEffect } from 'react';

/**
 * Simple Contact Us popup. Visibility is controlled by the parent
 * (e.g. the Footer link).
 *
 * @param {{ open: boolean, onClose: () => void }} props
 */
const ContactModal = ({ open, onClose }) => {
  // Dismiss on Escape while the dialog is open.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="terms-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-modal-title"
    >
      <div className="terms-modal__backdrop" onClick={onClose} aria-hidden="true" />

      <div className="terms-modal__card">
        <div className="terms-modal__head">
          <h2 id="contact-modal-title" className="terms-modal__title">
            Contact Us
          </h2>
          <button
            type="button"
            className="terms-modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              close
            </span>
          </button>
        </div>

        <div className="terms-modal__body">
          <p className="terms-modal__intro">
            Need help with a redemption or have a question about your points? Reach out
            and our team will get back to you.
          </p>

          <ul className="contact-modal__list">
            <li className="contact-modal__item">
              <span className="material-symbols-outlined" aria-hidden="true">
                mail
              </span>
              <div>
                <span className="contact-modal__label">Email</span>
                <a className="contact-modal__value" href="mailto:support@cartredeem.com">
                  support@cartredeem.com
                </a>
              </div>
            </li>
            <li className="contact-modal__item">
              <span className="material-symbols-outlined" aria-hidden="true">
                call
              </span>
              <div>
                <span className="contact-modal__label">Phone</span>
                <a className="contact-modal__value" href="tel:+18005550100">
                  +60-12-345-6789
                </a>
              </div>
            </li>
            <li className="contact-modal__item">
              <span className="material-symbols-outlined" aria-hidden="true">
                schedule
              </span>
              <div>
                <span className="contact-modal__label">Support hours</span>
                <span className="contact-modal__value">Mon&ndash;Fri, 9am&ndash;6pm</span>
              </div>
            </li>
          </ul>
        </div>

        <div className="terms-modal__footer">
          <button type="button" className="terms-modal__done" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContactModal;
