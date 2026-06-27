import { useRef, useState } from 'react';
import { updateMe, getAuthErrorMessage } from '../api/auth';
import { useToast } from '../components/ToastProvider';

// Capitalise the first letter so "afham" shows as "Afham".
const toDisplayName = (name) =>
  name ? name.charAt(0).toUpperCase() + name.slice(1) : 'there';

// Read a selected image file and downscale it to a small square-ish JPEG data
// URL, so the stored avatar stays well within the request body size limit and
// localStorage quota. Runs entirely in the browser — nothing is uploaded until
// the user hits Save.
const readAndResizeImage = (file, maxDim = 320) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That file is not a valid image.'));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

/**
 * Edit the signed-in user's profile (photo, name, email, phone, password).
 * Persists to the backend via PATCH /api/auth/me, then hands the fresh user
 * back to the app so the profile page and the nav-bar avatar both update.
 *
 * @param {{ user: object, onSaved?: (user: object) => void, onCancel?: () => void }} props
 */
const EditProfile = ({ user, onSaved, onCancel }) => {
  const fileInputRef = useRef(null);
  const toast = useToast();

  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  // Avatar data URL staged for save ('' = fall back to the default icon).
  const [avatar, setAvatar] = useState(user?.avatar || '');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const initial = toDisplayName(username).charAt(0).toUpperCase();

  const handlePickFile = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // let the user re-pick the same file later
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    // Guard against very large originals (we downscale anyway).
    if (file.size > 8 * 1024 * 1024) {
      setError('That image is too large. Please pick one under 8MB.');
      return;
    }
    try {
      const dataUrl = await readAndResizeImage(file);
      setAvatar(dataUrl);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not process that image.');
    }
  };

  const handleRemovePhoto = () => setAvatar('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Name cannot be empty.');
      return;
    }
    if (!email.trim()) {
      setError('Email cannot be empty.');
      return;
    }

    // Password change is optional; if any password field is filled, validate
    // the whole set before sending.
    const wantsPasswordChange = currentPassword || newPassword || confirmPassword;
    if (wantsPasswordChange) {
      if (!currentPassword) {
        setError('Enter your current password to set a new one.');
        return;
      }
      if (newPassword.length < 6) {
        setError('New password must be at least 6 characters.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('New password and confirmation do not match.');
        return;
      }
    }

    const changes = {
      username: username.trim(),
      email: email.trim(),
      phone: phone.trim(),
      avatar,
    };
    if (wantsPasswordChange) {
      changes.currentPassword = currentPassword;
      changes.newPassword = newPassword;
    }

    setSaving(true);
    try {
      const updated = await updateMe(changes);
      toast.success('Profile updated');
      onSaved?.(updated);
    } catch (err) {
      setError(getAuthErrorMessage(err));
      setSaving(false);
    }
  };

  return (
    <main className="main-content container-max page-px">
      <div className="profile">
        <div className="detail__back">
          <button type="button" className="detail__back-btn" onClick={() => onCancel?.()}>
            <span className="material-symbols-outlined">arrow_back</span>
            Back to profile
          </button>
        </div>

        <form className="profile-card edit-form" onSubmit={handleSubmit}>
          <h1 className="text-headline-md profile-card__title">Edit Personal Information</h1>

          {/* Profile photo */}
          <div className="edit-photo">
            <div className={`edit-photo__preview${avatar ? ' edit-photo__preview--img' : ''}`}>
              {avatar ? <img src={avatar} alt="Profile preview" /> : <span aria-hidden="true">{initial}</span>}
            </div>
            <div className="edit-photo__actions">
              <button type="button" className="profile-action profile-action--primary" onClick={handlePickFile}>
                <span className="material-symbols-outlined">photo_camera</span>
                Change Photo
              </button>
              {avatar && (
                <button type="button" className="profile-action" onClick={handleRemovePhoto}>
                  <span className="material-symbols-outlined">delete</span>
                  Remove
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleFileChange}
            />
          </div>

          {/* Details */}
          <div className="edit-field">
            <label className="edit-label" htmlFor="edit-name">Full Name</label>
            <div className="edit-input-wrap">
              <span className="material-symbols-outlined edit-input-icon">person</span>
              <input
                id="edit-name"
                className="edit-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your name"
              />
            </div>
          </div>

          <div className="edit-field">
            <label className="edit-label" htmlFor="edit-email">Email Address</label>
            <div className="edit-input-wrap">
              <span className="material-symbols-outlined edit-input-icon">mail</span>
              <input
                id="edit-email"
                className="edit-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div className="edit-field">
            <label className="edit-label" htmlFor="edit-phone">Phone Number</label>
            <div className="edit-input-wrap">
              <span className="material-symbols-outlined edit-input-icon">call</span>
              <input
                id="edit-phone"
                className="edit-input"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>

          <div className="edit-divider"><span>Change Password</span></div>
          <p className="edit-hint text-label-sm">Leave these blank to keep your current password.</p>

          <div className="edit-field">
            <label className="edit-label" htmlFor="edit-old-pw">Old Password</label>
            <div className="edit-input-wrap">
              <span className="material-symbols-outlined edit-input-icon">lock</span>
              <input
                id="edit-old-pw"
                className="edit-input"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="edit-field">
            <label className="edit-label" htmlFor="edit-new-pw">New Password</label>
            <div className="edit-input-wrap">
              <span className="material-symbols-outlined edit-input-icon">lock_reset</span>
              <input
                id="edit-new-pw"
                className="edit-input"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="At least 6 characters"
              />
            </div>
          </div>

          <div className="edit-field">
            <label className="edit-label" htmlFor="edit-confirm-pw">Confirm New Password</label>
            <div className="edit-input-wrap">
              <span className="material-symbols-outlined edit-input-icon">lock_reset</span>
              <input
                id="edit-confirm-pw"
                className="edit-input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Re-enter new password"
              />
            </div>
          </div>

          {error && (
            <div className="auth-error" role="alert">
              <span className="material-symbols-outlined auth-error__icon">error</span>
              {error}
            </div>
          )}

          <div className="edit-actions">
            <button type="submit" className="profile-action profile-action--primary" disabled={saving}>
              <span className="material-symbols-outlined">save</span>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <button type="button" className="profile-action" onClick={() => onCancel?.()} disabled={saving}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </main>
  );
};

export default EditProfile;
