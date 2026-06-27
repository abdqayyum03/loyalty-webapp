import { useEffect, useState } from 'react';

/**
 * Admin → Vouchers → Create / Edit (modal).
 *
 * Renders the "Add New Voucher" form from the mockup as a modal over the
 * voucher list. The fields map onto the actual Voucher schema
 * (title, category_id, points, quantity_available, image, description,
 * valid_until, terms, is_active). "Valid Until" is an optional expiry date and
 * "Terms & Conditions" is an editable list of lines shown on the voucher
 * detail page.
 *
 * Purely controlled: the parent owns the API call (and the `saving` / `error`
 * state) and passes a normalised payload back through `onSubmit`.
 *
 * @param {{
 *   voucher?: object|null,      // null ⇒ create mode, otherwise edit mode
 *   categories: object[],
 *   saving?: boolean,
 *   error?: string,
 *   onClose: () => void,
 *   onSubmit: (payload: object) => void,
 * }} props
 */

// Short, mockup-style tips shown alongside the form.
const TIPS = [
  'Use short, memorable titles for higher redemption rates.',
  'Set the points to match the perceived value of the reward.',
  'A clear description and image build trust at checkout.',
];

// Standard terms pre-filled for a new voucher (mirrors the backend schema
// default + the voucher detail page fallback).
const DEFAULT_TERMS = [
  'Subject to voucher availability.',
  'Not exchangeable for cash.',
  'Cannot be combined with other promotions unless stated.',
  'Final redemption terms are confirmed during checkout.',
];

const blankForm = {
  title: '',
  category_id: '',
  points: '',
  quantity_available: '100',
  image: '',
  description: '',
  valid_until: '',
  terms: [...DEFAULT_TERMS],
  is_active: true,
};

// A Date / ISO string from the API → the `YYYY-MM-DD` a <input type="date">
// expects. Returns '' when there is no (valid) date.
const toDateInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

const AdminVoucherForm = ({
  voucher = null,
  categories = [],
  saving = false,
  error = '',
  onClose,
  onSubmit,
}) => {
  const isEdit = Boolean(voucher);
  const [form, setForm] = useState(blankForm);
  const [touched, setTouched] = useState(false);

  // Hydrate the form whenever the target voucher changes (open / switch row).
  useEffect(() => {
    if (voucher) {
      setForm({
        title: voucher.title ?? '',
        // category_id may be a populated object or a raw id.
        category_id: String(voucher.category_id?._id || voucher.category_id || ''),
        points: voucher.points != null ? String(voucher.points) : '',
        quantity_available:
          voucher.quantity_available != null ? String(voucher.quantity_available) : '100',
        image: voucher.image ?? '',
        description: voucher.description ?? '',
        valid_until: toDateInput(voucher.valid_until),
        terms:
          Array.isArray(voucher.terms) && voucher.terms.length > 0
            ? voucher.terms
            : [...DEFAULT_TERMS],
        is_active: voucher.is_active ?? true,
      });
    } else {
      setForm(blankForm);
    }
    setTouched(false);
  }, [voucher]);

  // Close on Escape for parity with the redeem modal.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !saving) onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  const setField = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // ── Terms & Conditions list editing ──────────────────────────────────
  const setTerm = (index) => (e) => {
    const value = e.target.value;
    setForm((prev) => {
      const terms = [...prev.terms];
      terms[index] = value;
      return { ...prev, terms };
    });
  };
  const addTerm = () =>
    setForm((prev) => ({ ...prev, terms: [...prev.terms, ''] }));
  const removeTerm = (index) =>
    setForm((prev) => ({ ...prev, terms: prev.terms.filter((_, i) => i !== index) }));

  // Required-field check used to gate the submit button + inline hints.
  const missing = {
    title: !form.title.trim(),
    category_id: !form.category_id,
    points: form.points === '' || Number(form.points) < 0,
    description: !form.description.trim(),
  };
  const isValid = !Object.values(missing).some(Boolean);

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (!isValid) return;

    onSubmit({
      title: form.title.trim(),
      category_id: form.category_id,
      points: Number(form.points),
      quantity_available: Number(form.quantity_available) || 0,
      image: form.image.trim() || null,
      description: form.description.trim(),
      valid_until: form.valid_until || null,
      terms: form.terms.map((t) => t.trim()).filter(Boolean),
      is_active: form.is_active,
    });
  };

  return (
    <div className="admin-modal" role="dialog" aria-modal="true" aria-label={isEdit ? 'Edit voucher' : 'Add new voucher'}>
      <div className="admin-modal__backdrop" onClick={() => !saving && onClose?.()} />

      <div className="admin-modal__card admin-modal__card--wide">
        <div className="admin-modal__head">
          <div>
            <h2 className="admin-modal__title">{isEdit ? 'Edit Voucher' : 'Add New Voucher'}</h2>
            <p className="admin-modal__subtitle">
              {isEdit
                ? 'Update the details for this reward.'
                : 'Create a new reward for your customers to redeem.'}
            </p>
          </div>
          <button
            type="button"
            className="admin-modal__close"
            onClick={() => onClose?.()}
            disabled={saving}
            aria-label="Close"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="admin-modal__body admin-voucher-form__body">
          <form className="admin-form" onSubmit={handleSubmit} noValidate>
            {/* Voucher name */}
            <div className="admin-field">
              <label className="admin-field__label" htmlFor="vf-title">Voucher Name</label>
              <input
                id="vf-title"
                type="text"
                className="admin-input"
                placeholder="e.g. RM10 Off Your Next Order"
                value={form.title}
                onChange={setField('title')}
                disabled={saving}
              />
              {touched && missing.title && (
                <span className="admin-field__error">A voucher name is required.</span>
              )}
            </div>

            <div className="admin-form__grid">
              {/* Category */}
              <div className="admin-field">
                <label className="admin-field__label" htmlFor="vf-category">Category</label>
                <select
                  id="vf-category"
                  className="admin-input admin-select"
                  value={form.category_id}
                  onChange={setField('category_id')}
                  disabled={saving}
                >
                  <option value="">Select a category…</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
                {touched && missing.category_id && (
                  <span className="admin-field__error">Choose a category.</span>
                )}
              </div>

              {/* Points */}
              <div className="admin-field">
                <label className="admin-field__label" htmlFor="vf-points">Points Required</label>
                <div className="admin-input-affix">
                  <input
                    id="vf-points"
                    type="number"
                    min="0"
                    className="admin-input"
                    placeholder="0"
                    value={form.points}
                    onChange={setField('points')}
                    disabled={saving}
                  />
                  <span className="admin-input-affix__unit">pts</span>
                </div>
                {touched && missing.points && (
                  <span className="admin-field__error">Enter a valid points value.</span>
                )}
              </div>
            </div>

            <div className="admin-form__grid">
              {/* Usage limit / stock */}
              <div className="admin-field">
                <label className="admin-field__label" htmlFor="vf-stock">Quantity Available</label>
                <input
                  id="vf-stock"
                  type="number"
                  min="0"
                  className="admin-input"
                  placeholder="100"
                  value={form.quantity_available}
                  onChange={setField('quantity_available')}
                  disabled={saving}
                />
              </div>

              {/* Status */}
              <div className="admin-field">
                <label className="admin-field__label" htmlFor="vf-status">Status</label>
                <select
                  id="vf-status"
                  className="admin-input admin-select"
                  value={form.is_active ? 'active' : 'inactive'}
                  onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.value === 'active' }))}
                  disabled={saving}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Valid until (expiry) */}
            <div className="admin-field">
              <label className="admin-field__label" htmlFor="vf-valid-until">
                Valid Until <span className="admin-field__optional">(optional)</span>
              </label>
              <input
                id="vf-valid-until"
                type="date"
                className="admin-input"
                value={form.valid_until}
                onChange={setField('valid_until')}
                disabled={saving}
              />
              <span className="admin-field__hint">
                Leave empty if the voucher has no expiry date.
              </span>
            </div>

            {/* Image URL + preview */}
            <div className="admin-field">
              <label className="admin-field__label" htmlFor="vf-image">Voucher Image URL</label>
              <div className="admin-image-row">
                <input
                  id="vf-image"
                  type="url"
                  className="admin-input"
                  placeholder="https://…/voucher.png"
                  value={form.image}
                  onChange={setField('image')}
                  disabled={saving}
                />
                <div className="admin-image-preview" aria-hidden="true">
                  {form.image ? (
                    <img src={form.image} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  ) : (
                    <span className="material-symbols-outlined">image</span>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="admin-field">
              <label className="admin-field__label" htmlFor="vf-desc">Description</label>
              <textarea
                id="vf-desc"
                className="admin-input admin-textarea"
                rows={3}
                placeholder="Describe the terms and conditions for this voucher…"
                value={form.description}
                onChange={setField('description')}
                disabled={saving}
              />
              {touched && missing.description && (
                <span className="admin-field__error">A description is required.</span>
              )}
            </div>

            {/* Terms & Conditions (editable list) */}
            <div className="admin-field">
              <label className="admin-field__label">Terms &amp; Conditions</label>
              <span className="admin-field__hint">
                These appear as a bulleted list on the voucher detail page. Add one
                condition per line.
              </span>
              <div className="admin-terms">
                {form.terms.map((term, i) => (
                  <div className="admin-terms__row" key={i}>
                    <span className="admin-terms__bullet" aria-hidden="true">
                      {i + 1}.
                    </span>
                    <input
                      type="text"
                      className="admin-input"
                      placeholder="e.g. Not exchangeable for cash."
                      value={term}
                      onChange={setTerm(i)}
                      disabled={saving}
                      aria-label={`Term ${i + 1}`}
                    />
                    <button
                      type="button"
                      className="admin-icon-action admin-icon-action--danger"
                      onClick={() => removeTerm(i)}
                      disabled={saving}
                      title="Remove condition"
                      aria-label={`Remove term ${i + 1}`}
                    >
                      <span className="material-symbols-outlined" aria-hidden="true">close</span>
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="admin-panel__link admin-terms__add"
                onClick={addTerm}
                disabled={saving}
              >
                <span className="material-symbols-outlined" aria-hidden="true">add</span>
                Add condition
              </button>
            </div>

            {error && (
              <p className="admin-error admin-form__error" role="alert">
                <span className="material-symbols-outlined" aria-hidden="true">error</span>
                {error}
              </p>
            )}

            <div className="admin-modal__footer">
              <button type="button" className="admin-refresh" onClick={() => onClose?.()} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="admin-new-btn admin-modal__submit" disabled={saving || (touched && !isValid)}>
                <span className="material-symbols-outlined" aria-hidden="true">
                  {saving ? 'progress_activity' : isEdit ? 'save' : 'add'}
                </span>
                {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Voucher'}
              </button>
            </div>
          </form>

          {/* Optimization tips (mockup's right rail) */}
          <aside className="admin-tips">
            <p className="admin-tips__head">
              <span className="material-symbols-outlined" aria-hidden="true">lightbulb</span>
              Optimization Tips
            </p>
            <ul className="admin-tips__list">
              {TIPS.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default AdminVoucherForm;
