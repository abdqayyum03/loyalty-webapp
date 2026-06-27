import { useEffect, useState } from 'react';

/**
 * Admin → Categories → Create / Edit (modal).
 *
 * Renders the "Create New Category" form from the mockup: name, an icon
 * picker, description, and an active/visible toggle, alongside a live preview
 * of how the category will look in the customer app. Maps onto the Category
 * schema (name, description, icon).
 *
 * Controlled component — the parent owns the API call and the `saving` /
 * `error` state and receives a normalised payload through `onSubmit`.
 *
 * @param {{
 *   category?: object|null,   // null ⇒ create mode
 *   saving?: boolean,
 *   error?: string,
 *   onClose: () => void,
 *   onSubmit: (payload: object) => void,
 * }} props
 */

// Curated icon set for the picker (material symbol names), mirroring the mockup.
const ICON_CHOICES = [
  'restaurant', 'shopping_bag', 'devices', 'redeem', 'flight', 'directions_car',
  'sports_tennis', 'movie', 'work', 'health_and_safety', 'spa', 'celebration',
  'sports_esports', 'pets', 'school', 'star',
];

const DEFAULT_ICON = 'restaurant';

const AdminCategoryForm = ({
  category = null,
  saving = false,
  error = '',
  onClose,
  onSubmit,
}) => {
  const isEdit = Boolean(category);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(DEFAULT_ICON);
  const [description, setDescription] = useState('');
  const [touched, setTouched] = useState(false);

  // Hydrate from the target category whenever it changes.
  useEffect(() => {
    if (category) {
      setName(category.name ?? '');
      setIcon(category.icon || DEFAULT_ICON);
      setDescription(category.description ?? '');
    } else {
      setName('');
      setIcon(DEFAULT_ICON);
      setDescription('');
    }
    setTouched(false);
  }, [category]);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !saving) onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  const nameMissing = !name.trim();

  const handleSubmit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (nameMissing) return;
    onSubmit({
      name: name.trim(),
      icon,
      description: description.trim(),
    });
  };

  return (
    <div className="admin-modal" role="dialog" aria-modal="true" aria-label={isEdit ? 'Edit category' : 'Create new category'}>
      <div className="admin-modal__backdrop" onClick={() => !saving && onClose?.()} />

      <div className="admin-modal__card admin-modal__card--wide">
        <div className="admin-modal__head">
          <div>
            <h2 className="admin-modal__title">{isEdit ? 'Edit Category' : 'Create New Category'}</h2>
            <p className="admin-modal__subtitle">
              Define a classification for vouchers to help users discover rewards easily.
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
            {/* Name */}
            <div className="admin-field">
              <label className="admin-field__label" htmlFor="cf-name">Category Name</label>
              <input
                id="cf-name"
                type="text"
                className="admin-input"
                placeholder="e.g. Gourmet Dining"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={saving}
              />
              {touched && nameMissing && (
                <span className="admin-field__error">A category name is required.</span>
              )}
            </div>

            {/* Icon picker */}
            <div className="admin-field">
              <span className="admin-field__label">Category Icon</span>
              <div className="admin-icon-picker" role="radiogroup" aria-label="Category icon">
                {ICON_CHOICES.map((choice) => (
                  <button
                    type="button"
                    key={choice}
                    className={`admin-icon-choice${icon === choice ? ' admin-icon-choice--active' : ''}`}
                    onClick={() => setIcon(choice)}
                    disabled={saving}
                    aria-pressed={icon === choice}
                    title={choice.replace(/_/g, ' ')}
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">{choice}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="admin-field">
              <label className="admin-field__label" htmlFor="cf-desc">Description</label>
              <textarea
                id="cf-desc"
                className="admin-input admin-textarea"
                rows={3}
                placeholder="Briefly describe what this category covers…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={saving}
              />
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
              <button type="submit" className="admin-new-btn admin-modal__submit" disabled={saving || (touched && nameMissing)}>
                <span className="material-symbols-outlined" aria-hidden="true">
                  {saving ? 'progress_activity' : isEdit ? 'save' : 'add'}
                </span>
                {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Category'}
              </button>
            </div>
          </form>

          {/* Live preview rail (mockup's right column) */}
          <aside className="admin-preview">
            <p className="admin-preview__head">
              <span className="material-symbols-outlined" aria-hidden="true">visibility</span>
              Live Preview
            </p>

            <p className="admin-preview__label">User App Card</p>
            <div className="admin-preview__card">
              <span className="admin-preview__icon" aria-hidden="true">
                <span className="material-symbols-outlined">{icon}</span>
              </span>
              <div className="admin-preview__text">
                <span className="admin-preview__name">{name.trim() || 'Category name'}</span>
                <span className="admin-preview__desc">
                  {description.trim() || 'Vouchers in this category…'}
                </span>
              </div>
              <span className="material-symbols-outlined admin-preview__chevron" aria-hidden="true">
                chevron_right
              </span>
            </div>

            <p className="admin-preview__label">Filter Badge</p>
            <div className="admin-preview__badges">
              <span className="admin-preview__badge admin-preview__badge--active">
                <span className="material-symbols-outlined" aria-hidden="true">{icon}</span>
                {name.trim() || 'Category'}
              </span>
              <span className="admin-preview__badge">
                <span className="material-symbols-outlined" aria-hidden="true">sell</span>
                All
              </span>
            </div>

            <div className="admin-tips admin-preview__tip">
              <p className="admin-tips__head">
                <span className="material-symbols-outlined" aria-hidden="true">lightbulb</span>
                Design Tip
              </p>
              <p className="admin-preview__tip-text">
                Choose a distinct icon that captures the essence of the category — clear
                categorisation makes rewards easier to find.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default AdminCategoryForm;
