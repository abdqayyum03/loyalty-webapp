const express = require('express');
const router = express.Router();
const {
  getVouchers,
  getVoucher,
  getVouchersByCategory,
  createVoucher,
} = require('../controllers/voucherController');

router.get('/', getVouchers);
router.get('/:id', getVoucher);
router.get('/category/:categoryId', getVouchersByCategory);
router.post('/', createVoucher); // Admin only

module.exports = router;