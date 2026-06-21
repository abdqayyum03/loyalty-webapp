const express = require('express');
const orderController = require('../controllers/orderController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/checkout', protect, orderController.checkout);
router.get('/history', protect, orderController.getOrderHistory);
router.get('/:orderId', protect, orderController.getOrderById);
router.get('/:orderId/pdf', protect, orderController.downloadOrderPDF);

module.exports = router;