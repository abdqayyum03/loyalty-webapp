const express = require('express');
const router = express.Router();
const {
  checkout,
  getOrderHistory,
  getOrderDetails,
} = require('../controllers/orderController');
const { protect } = require('../middleware/auth');

// POST checkout
router.post('/checkout', protect, checkout);

// GET order history
router.get('/history', protect, getOrderHistory);

// GET specific order
router.get('/:orderId', protect, getOrderDetails);

module.exports = router;