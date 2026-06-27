import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const TOKEN_KEY = 'vp_admin_token';
const USER_KEY  = 'vp_admin_user';

export const ADMIN_ACTIVITY_KEY = 'vp_admin_last_activity';

const saveSession = ({ token, user }) => {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    if (user)  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const getAdminToken = () => localStorage.getItem(TOKEN_KEY);

export const getAdminUser = () => {
    try {
        return JSON.parse(localStorage.getItem(USER_KEY));
    } catch {
        return null;
    }
};

export const isAdminAuthenticated = () => Boolean(getAdminToken());

export const adminLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    // Reset the idle timestamp so the next admin sign-in gets a fresh window.
    localStorage.removeItem(ADMIN_ACTIVITY_KEY);
};

// Throws early if there is no token so callers can surface "please sign in" instead of a 401.
const authConfig = () => {
    const token = getAdminToken();
    if (!token) throw new Error('Not authenticated');
    return { headers: { Authorization: `Bearer ${token}` } };
};

// POST /api/admin/login → { success, token, user }. Only accounts whose role is
// 'admin' (and that are active) are accepted by the backend.
export const adminLogin = async ({ email, password }) => {
    const { data } = await axios.post(`${API}/admin/login`, { email, password });
    saveSession(data);
    return data;
};

// GET /api/admin/statistics → { success, statistics, recentOrders, topVouchers }
export const getStatistics = async () => {
    const { data } = await axios.get(`${API}/admin/statistics`, authConfig());
    return data;
};

// GET /api/admin/users → { success, count, data: [...] }
export const getAllUsers = async () => {
    const { data } = await axios.get(`${API}/admin/users`, authConfig());
    return data.data ?? [];
};

// GET /api/admin/orders → { success, count, data: [...] }
export const getAllOrders = async () => {
    const { data } = await axios.get(`${API}/admin/orders`, authConfig());
    return data.data ?? [];
};

// GET /api/admin/orders/:id/pdf → regenerates and streams the order receipt.
// Fetched as a blob (with the admin bearer token) then saved via a temporary
// link, since a plain <a> can't send the Authorization header.
export const downloadOrderPDF = async (orderId) => {
    const response = await axios.get(`${API}/admin/orders/${orderId}/pdf`, {
        ...authConfig(),
        responseType: 'blob',
    });

    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `Order-${orderId}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
};

// PUT /api/admin/users/:id/deactivate → returns the updated user document.
export const deactivateUser = async (userId) => {
    const { data } = await axios.put(`${API}/admin/users/${userId}/deactivate`, {}, authConfig());
    return data.data;
};

// PUT /api/admin/users/:id/activate → returns the updated user document.
export const activateUser = async (userId) => {
    const { data } = await axios.put(`${API}/admin/users/${userId}/activate`, {}, authConfig());
    return data.data;
};

// PUT /api/admin/users/:id/role → promote/demote between 'user' and 'admin'.
// Returns the updated user document.
export const updateUserRole = async (userId, role) => {
    const { data } = await axios.put(`${API}/admin/users/${userId}/role`, { role }, authConfig());
    return data.data;
};

// ── Voucher management (admin CRUD) ──────────────────────────────────────
// The list/read endpoints are public, but the dashboard reads them through
// here so all admin data flows from one module. Create/update/delete are
// protected by the admin bearer token.

// GET /api/vouchers → { success, count, data } (data has category_id populated).
export const getAllVouchers = async () => {
    const { data } = await axios.get(`${API}/vouchers`);
    return data.data ?? [];
};

// GET /api/categories → { success, count, data }. Used to populate the
// category dropdown in the voucher form.
export const getAllCategories = async () => {
    const { data } = await axios.get(`${API}/categories`);
    return data.data ?? [];
};

// POST /api/vouchers → returns the created voucher document.
export const createVoucher = async (payload) => {
    const { data } = await axios.post(`${API}/vouchers`, payload, authConfig());
    return data.data;
};

// PUT /api/vouchers/:id → returns the updated voucher document.
export const updateVoucher = async (voucherId, payload) => {
    const { data } = await axios.put(`${API}/vouchers/${voucherId}`, payload, authConfig());
    return data.data;
};

// DELETE /api/vouchers/:id → returns the deleted voucher document.
export const deleteVoucher = async (voucherId) => {
    const { data } = await axios.delete(`${API}/vouchers/${voucherId}`, authConfig());
    return data.data;
};

// ── Category management (admin CRUD) ──────────────────────────────────────
// POST /api/categories → returns the created category document.
export const createCategory = async (payload) => {
    const { data } = await axios.post(`${API}/categories`, payload, authConfig());
    return data.data;
};

// PUT /api/categories/:id → returns the updated category document.
export const updateCategory = async (categoryId, payload) => {
    const { data } = await axios.put(`${API}/categories/${categoryId}`, payload, authConfig());
    return data.data;
};

// DELETE /api/categories/:id → returns the deleted category document.
export const deleteCategory = async (categoryId) => {
    const { data } = await axios.delete(`${API}/categories/${categoryId}`, authConfig());
    return data.data;
};

// Turn an axios error into a user-friendly message. The backend uses `error`
// for failures and `message` for some responses — accept either.
export const getAdminErrorMessage = (error) => {
    const data = error?.response?.data;
    if (data?.error || data?.message) return data.error || data.message;
    if (error?.response) return 'Request failed. Please try again.';
    return 'Cannot reach the server. Is the backend running?';
};
