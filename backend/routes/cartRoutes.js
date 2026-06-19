const express = require('express');
const router = express.Router();
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
} = require('../controllers/cartController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getCart);
router.post('/', protect, addToCart);
router.put('/:cartItemId', protect, updateCartItem);
router.delete('/:cartItemId', protect, removeFromCart);

module.exports = router;