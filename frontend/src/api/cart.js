import axios from 'axios';
import { getToken } from './auth';
import { getCategories, normalizeVoucher } from './voucher';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Every cart endpoint is behind the `protect` middleware, so each request must
// carry the signed-in user's bearer token.
const authConfig = () => ({
    headers: { Authorization: `Bearer ${getToken()}` }
});

// The backend wraps payloads as { success, count?, data }. Unwrap to `data`.
const unwrap = (response) => response.data?.data ?? response.data;

const createCategoryMap = (categories) =>
    categories.reduce((map, category) => {
        map[String(category._id || category.id)] = category.name;
        return map;
    }, {});

/**
 * Fetch the signed-in user's cart, with each line's voucher fully normalised so
 * the Cart page can render it exactly like the rest of the catalogue.
 * @returns {Promise<{ items: Array, totalPoints: number, count: number, totalQuantity: number }>}
 */
export const getCart = async () => {
    const [cartResponse, categories] = await Promise.all([
        axios.get(`${API}/cart`, authConfig()),
        getCategories()
    ]);

    const categoriesById = createCategoryMap(categories);
    const rawItems = unwrap(cartResponse) || [];

    const items = rawItems
        // Guard against a voucher that was deleted after being added to a cart.
        .filter((item) => item.voucher_id)
        .map((item) => ({
            cartItemId: item._id || item.id,
            quantity: item.quantity || 1,
            pointsRequired: item.points_required ?? 0,
            voucher: normalizeVoucher(item.voucher_id, categoriesById)
        }));

    const totalPoints = items.reduce((sum, item) => sum + (item.pointsRequired || 0), 0);
    const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 1), 0);

    return { items, totalPoints, count: items.length, totalQuantity };
};

/** Total number of vouchers in the cart — used for the nav-bar badge. */
export const getCartCount = () =>
    axios
        .get(`${API}/cart`, authConfig())
        .then((response) => (unwrap(response) || []).reduce((sum, item) => sum + (item.quantity || 1), 0));

/** Add a voucher to the cart (creates the line, or bumps its quantity). */
export const addToCart = (voucherId, quantity = 1) =>
    axios
        .post(`${API}/cart`, { voucher_id: voucherId, quantity }, authConfig())
        .then(unwrap);

/** Remove a single cart line by its id. */
export const removeFromCart = (cartItemId) =>
    axios.delete(`${API}/cart/${cartItemId}`, authConfig()).then((response) => response.data);

/**
 * Redeem everything in the cart. The backend deducts points, records each
 * redemption (one CartItemHistory per voucher) and emails a confirmation.
 * @returns {Promise<object>} the response payload, incl. `orderDetails.orders`.
 */
export const checkout = () =>
    axios.post(`${API}/orders/checkout`, {}, authConfig()).then((response) => response.data);

/**
 * Redeem a single voucher directly, without going through the cart.
 * @returns {Promise<object>} the response payload, incl. `orderDetails.orders`.
 */
export const redeemVoucher = (voucherId, quantity = 1) =>
    axios
        .post(`${API}/orders/redeem`, { voucher_id: voucherId, quantity }, authConfig())
        .then((response) => response.data);

/**
 * Fetch the signed-in user's voucher redemption history, newest first.
 * @returns {Promise<Array>} CartItemHistory records.
 */
export const getOrderHistory = () =>
    axios
        .get(`${API}/orders/history`, authConfig())
        .then((response) => response.data?.data ?? []);

/**
 * Download an order's receipt PDF. The endpoint is behind `protect`, so we fetch
 * it as a blob with the bearer token and trigger a browser save — a plain <a>
 * link can't send the Authorization header.
 */
export const downloadOrderReceipt = async (orderId) => {
    const response = await axios.get(`${API}/orders/${orderId}/pdf`, {
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

/** Turn an axios/cart error into a user-friendly message. */
export const getCartErrorMessage = (error) => {
    const data = error?.response?.data;
    if (data?.error || data?.message) return data.error || data.message;
    if (error?.response) return 'Redemption failed. Please try again.';
    return 'Cannot reach the server. Is the backend running?';
};
