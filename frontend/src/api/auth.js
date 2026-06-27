import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const TOKEN_KEY = 'vp_token';
const USER_KEY  = 'vp_user';

// localStorage key for the inactivity auto-logout's last-activity timestamp.
// Exported so the idle-logout hook and the logout below stay on the same key.
export const ACTIVITY_KEY = 'vp_last_activity';

// Persist the token + user returned by the backend so later requests can
// authenticate and the UI can show who is logged in.
const saveSession = ({ token, user }) => {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    if (user)  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

// Backend endpoint that kicks off the Google OAuth flow. We navigate the whole
// browser here (not an axios call) so Google can show its consent screen and
// then redirect back to /auth/google/success with our token.
export const GOOGLE_LOGIN_URL = `${API}/auth/google`;

// Store only a token — used by the Google OAuth redirect, which has no user
// payload. App.js fetches the live profile via getMe() right afterwards.
export const saveToken = (token) => {
    if (token) localStorage.setItem(TOKEN_KEY, token);
};

export const login = async ({ identifier, password }) => {
    // The backend authenticates by `email`; the form field is generic
    // ("Email or Username"), so we send the typed value as `email`.
    const { data } = await axios.post(`${API}/auth/login`, { email: identifier, password });
    saveSession(data);
    return data;
};

// Register a new account (persisted to MongoDB by the backend). We intentionally
// do NOT save a session here — after creating the account the user is sent back
// to the Login screen to sign in.
//
// NOTE: this is the legacy one-shot register (creates the account immediately).
// The Sign Up screen uses the OTP flow below instead, so the account is only
// created after the emailed code is verified.
export const register = async ({ email, password, username }) => {
    const { data } = await axios.post(`${API}/auth/register`, { email, password, username });
    return data;
};

// Step 1 of email-verified signup: the backend stashes the pending account and
// emails a one-time code. NO user is created yet.
export const sendRegistrationOtp = async ({ email, password, username }) => {
    const { data } = await axios.post(`${API}/auth/send-otp`, { email, password, username });
    return data;
};

// Step 2 of email-verified signup: confirm the code. THIS is the call that
// actually creates the account in MongoDB. We don't persist a session — the
// user is sent back to Login to sign in.
export const verifyRegistrationOtp = async ({ email, otp }) => {
    const { data } = await axios.post(`${API}/auth/verify-otp`, { email, otp });
    return data;
};

// Ask the backend to email a fresh signup code for an in-progress registration.
// Also reused by the first-time Google flow, since the backend keys the pending
// code by email regardless of how it was started.
export const resendRegistrationOtp = async ({ email }) => {
    const { data } = await axios.post(`${API}/auth/resend-otp`, { email });
    return data;
};

// First-time "Login with Google": confirm the emailed code. THIS is the call
// that actually creates the Google-linked account and logs the user in, so it's
// where we persist the session.
export const verifyGoogleOtp = async ({ email, otp }) => {
    const { data } = await axios.post(`${API}/auth/verify-google-otp`, { email, otp });
    saveSession(data);
    return data;
};

// Step 1 of "forgot password": ask the backend to email a reset code. The code
// is keyed by email; no password is supplied yet. Also reused as "resend".
export const requestPasswordReset = async ({ email }) => {
    const { data } = await axios.post(`${API}/auth/forgot-password`, { email });
    return data;
};

// Step 2 of "forgot password": confirm the emailed code and set a new password.
// We don't persist a session — the user is sent back to Login to sign in.
export const resetPassword = async ({ email, otp, newPassword }) => {
    const { data } = await axios.post(`${API}/auth/reset-password`, { email, otp, newPassword });
    return data;
};

// Fetch the signed-in user's live profile (incl. the exact points balance)
// straight from the database, and refresh the cached copy so the rest of the
// UI stays in sync.
export const getMe = async () => {
    const token = getToken();
    if (!token) throw new Error('Not authenticated');

    const { data } = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    // GET /api/auth/me responds with { success, data: user }; older/login
    // payloads used { user }. Accept either so the avatar/points stay in sync.
    const user = data?.data ?? data?.user;
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
};

// Update the signed-in user's editable profile fields (name, email, phone,
// avatar, and optionally password). Refreshes the cached copy so the rest of
// the UI — including the nav-bar avatar — stays in sync.
export const updateMe = async (changes) => {
    const token = getToken();
    if (!token) throw new Error('Not authenticated');

    const { data } = await axios.patch(`${API}/auth/me`, changes, {
        headers: { Authorization: `Bearer ${token}` }
    });

    // PATCH /api/auth/me responds with { success, data: user } (matches getMe).
    const user = data?.data ?? data?.user;
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
};

export const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    // Clear the idle timestamp too, so the next sign-in starts with a fresh
    // 30-minute window instead of inheriting a stale (possibly expired) one.
    localStorage.removeItem(ACTIVITY_KEY);
};

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const getCurrentUser = () => {
    try {
        return JSON.parse(localStorage.getItem(USER_KEY));
    } catch {
        return null;
    }
};

export const isAuthenticated = () => Boolean(getToken());

// Turn an axios error into a user-friendly message (uses the backend's
// { message } payload when present).
export const getAuthErrorMessage = (error) => {
    // Backend uses `error` for failures and `message` for some responses — accept either.
    const data = error?.response?.data;
    if (data?.message || data?.error) return data.message || data.error;
    if (error?.response) return 'Login failed. Please try again.';
    return 'Cannot reach the server. Is the backend running?';
};
