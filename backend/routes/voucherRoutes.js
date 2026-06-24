const express = require('express');
const voucherController = require('../controllers/voucherController');
const { adminAuth } = require('../middleware/adminAuth');

const router = express.Router();

// Public routes
router.get('/', voucherController.getVouchers);
router.get('/:id', voucherController.getVoucherById);
router.get('/category/:categoryId', voucherController.getVouchersByCategory);

// Admin routes
router.post('/', adminAuth, voucherController.createVoucher);
router.put('/:id', adminAuth, voucherController.updateVoucher);
router.delete('/:id', adminAuth, voucherController.deleteVoucher);

module.exports = router;