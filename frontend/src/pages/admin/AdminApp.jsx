import { useState } from 'react';
import { isAdminAuthenticated, getAdminUser, adminLogout, ADMIN_ACTIVITY_KEY } from '../../api/admin';
import { useIdleLogout } from '../../hooks/useIdleLogout';
import AdminLogin from './AdminLogin';
import AdminDashboard from './AdminDashboard';

/**
 * Self-contained admin experience: shows the admin login until authenticated,
 * then the dashboard. Kept separate from the customer app (its own token + state)
 * and reached via the "#admin" URL hash from App.js.
 */
const AdminApp = () => {
  const [authed, setAuthed] = useState(() => isAdminAuthenticated());
  const [admin, setAdmin]   = useState(() => getAdminUser());
  const [notice, setNotice] = useState('');

  // Auto sign-out after 30 minutes of inactivity, matching the customer app.
  // Armed only while signed in; uses the admin-specific timestamp key so the
  // two sessions' countdowns stay independent.
  useIdleLogout({
    enabled: authed,
    storageKey: ADMIN_ACTIVITY_KEY,
    onIdle: () => {
      adminLogout();
      setAdmin(null);
      setAuthed(false);
      setNotice('You were signed out due to 30 minutes of inactivity. Please sign in again.');
    },
  });

  if (!authed) {
    return (
      <div className="app-shell">
        <AdminLogin
          notice={notice}
          onSuccess={() => {
            setNotice('');
            setAdmin(getAdminUser());
            setAuthed(true);
          }}
        />
      </div>
    );
  }

  return (
    <AdminDashboard
      admin={admin}
      onLogout={() => {
        adminLogout();
        setAdmin(null);
        setAuthed(false);
      }}
    />
  );
};

export default AdminApp;
