import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const CATEGORY_ICONS = {
    'Food & Beverage': 'restaurant',
    Shopping: 'shopping_bag',
    Travel: 'hotel'
};

const createCategoryMap = (categories) =>
    categories.reduce((map, category) => {
        map[String(category._id || category.id)] = category.name;
        return map;
    }, {});

const getCategoryName = (voucher, categoriesById = {}) => {
    const category = voucher.category_id || voucher.category;

    if (typeof category === 'string') {
        return categoriesById[category] || category;
    }

    return category?.name || categoriesById[String(category?._id || category?.id)] || 'Uncategorized';
};

// Turn a stored expiry date into a readable label. Accepts a Date/ISO string
// (from the `valid_until` column) or an already-friendly string; falls back to
// a neutral label when no expiry is set.
const getValidUntil = (voucher) => {
    const raw = voucher.validUntil || voucher.valid_until;
    if (!raw) return 'No expiry listed';

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return raw;

    return date.toLocaleDateString('en-MY', { year: 'numeric', month: 'short', day: 'numeric' });
};

// Whether the voucher is currently valid. Prefer the backend's computed
// `is_valid` virtual; fall back to deriving it locally from is_active +
// valid_until so the UI still works without it.
const getIsValid = (voucher) => {
    if (typeof voucher.is_valid === 'boolean') return voucher.is_valid;
    if (voucher.is_active === false) return false;

    const raw = voucher.valid_until;
    if (!raw) return true;

    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? true : date.getTime() >= Date.now();
};

// Pick the card badge from the expiry date: EXPIRED once past, EXPIRING within
// the final week, otherwise VALID. Vouchers with no expiry are always VALID.
const getBadge = (voucher) => {
    if (voucher.badge) return voucher.badge;

    const raw = voucher.valid_until || voucher.validUntil;
    if (!raw) return 'VALID';

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return 'VALID';

    const daysLeft = (date.getTime() - Date.now()) / 86400000;
    if (daysLeft < 0) return 'EXPIRED';
    if (daysLeft <= 7) return 'EXPIRING';
    return 'VALID';
};

const getOfferValue = (voucher) => {
    if (voucher.retailValue || voucher.retail_value) {
        return voucher.retailValue || voucher.retail_value;
    }

    const titleValue = voucher.title?.match(/RM\s?\d+(?:\.\d{2})?|\d+%/i)?.[0];
    return titleValue || 'See offer details';
};

export const normalizeVoucher = (voucher, categoriesById = {}) => {
    const category = getCategoryName(voucher, categoriesById);

    return {
        ...voucher,
        id: voucher._id || voucher.id,
        imageAlt: voucher.imageAlt || voucher.image_alt || voucher.title,
        badge: getBadge(voucher),
        isValid: getIsValid(voucher),
        icon: voucher.icon || CATEGORY_ICONS[category] || 'confirmation_number',
        category,
        validUntil: getValidUntil(voucher),
        voucherType: voucher.voucherType || voucher.voucher_type || 'Digital voucher',
        retailValue: getOfferValue(voucher),
        yourCost:
            voucher.yourCost ||
            voucher.your_cost ||
            (voucher.points !== undefined ? `${Number(voucher.points).toLocaleString()} points` : 'See offer details'),
        verified: voucher.verified ?? true,
        detailTitle: voucher.detailTitle || voucher.detail_title || voucher.title,
        detailDescription: voucher.detailDescription || voucher.detail_description || voucher.description,
        terms: Array.isArray(voucher.terms) && voucher.terms.length > 0
            ? voucher.terms
            : [
                'Subject to voucher availability.',
                'Not exchangeable for cash.',
                'Cannot be combined with other promotions unless stated.',
                'Final redemption terms are confirmed during checkout.'
            ]
    };
};

export const getVoucherCategories = (vouchers) => [
    'All',
    ...new Set(vouchers.map((voucher) => voucher.category).filter(Boolean))
];

// The backend wraps every payload as { success, count?, data }. Unwrap to the
// `data` field (falling back to the raw body so this still works if the shape
// ever changes back).
const unwrap = (response) => response.data?.data ?? response.data;

export const getCategories = () =>
    axios.get(`${API}/categories`).then((response) => unwrap(response) || []);

export const getVouchers = () =>
    Promise.all([
        axios.get(`${API}/vouchers`),
        getCategories()
    ]).then(([vouchersResponse, categories]) => {
        const categoriesById = createCategoryMap(categories);
        const vouchers = unwrap(vouchersResponse) || [];
        return vouchers.map((voucher) => normalizeVoucher(voucher, categoriesById));
    });

export const getVoucherById = (id) =>
    Promise.all([
        axios.get(`${API}/vouchers/${id}`),
        getCategories()
    ]).then(([voucherResponse, categories]) => {
        const categoriesById = createCategoryMap(categories);
        return normalizeVoucher(unwrap(voucherResponse), categoriesById);
    });
