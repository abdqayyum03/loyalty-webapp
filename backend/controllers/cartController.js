const CartItem = require('../models/CartItem');
const Voucher = require('../models/Voucher');

// @desc    Get user's cart items
// @route   GET /api/cart
// @access  Private
exports.getCart = async (req, res) => {
  try {
    const cartItems = await CartItem.find({ user_id: req.userId }).populate(
      'voucher_id'
    );

    // Calculate total points
    const totalPoints = cartItems.reduce(
      (sum, item) => sum + item.points_required,
      0
    );

    res.status(200).json({
      success: true,
      count: cartItems.length,
      totalPoints,
      data: cartItems,
    });
  } catch (error) {
    res.status(500).json({ 
      error: error.message 
    });
  }
};

// @desc    Add item to cart
// @route   POST /api/cart
// @access  Private
exports.addToCart = async (req, res) => {
  try {
    const { voucher_id, quantity } = req.body;

    if (!voucher_id || !quantity) {
      return res.status(400).json({ 
        error: 'Please provide voucher ID and quantity' 
      });
    }

    // Get voucher details
    const voucher = await Voucher.findById(voucher_id);
    if (!voucher) {
      return res.status(404).json({ 
        error: 'Voucher not found' 
      });
    }

    // Check if item already in cart
    let cartItem = await CartItem.findOne({
      user_id: req.userId,
      voucher_id,
    });

    if (cartItem) {
      // Update quantity
      cartItem.quantity += quantity;
      cartItem.points_required = cartItem.quantity * voucher.points;
      await cartItem.save();
    } else {
      // Create new cart item
      cartItem = await CartItem.create({
        user_id: req.userId,
        voucher_id,
        quantity,
        points_required: quantity * voucher.points,
      });
    }

    res.status(201).json({
      success: true,
      data: cartItem,
    });
  } catch (error) {
    res.status(500).json({ 
      error: error.message 
    });
  }
};

// @desc    Update cart item quantity
// @route   PUT /api/cart/:cartItemId
// @access  Private
exports.updateCartItem = async (req, res) => {
  try {
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({ 
        error: 'Invalid quantity' 
      });
    }

    let cartItem = await CartItem.findById(req.params.cartItemId);

    if (!cartItem) {
      return res.status(404).json({ 
        error: 'Cart item not found' 
      });
    }

    // Get voucher to calculate points
    const voucher = await Voucher.findById(cartItem.voucher_id);
    cartItem.quantity = quantity;
    cartItem.points_required = quantity * voucher.points;

    await cartItem.save();

    res.status(200).json({
      success: true,
      data: cartItem,
    });
  } catch (error) {
    res.status(500).json({ 
      error: error.message 
    });
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/:cartItemId
// @access  Private
exports.removeFromCart = async (req, res) => {
  try {
    const cartItem = await CartItem.findByIdAndDelete(req.params.cartItemId);

    if (!cartItem) {
      return res.status(404).json({ 
        error: 'Cart item not found' 
      });
    }

    res.status(200).json({
      success: true,
      message: 'Item removed from cart',
    });
  } catch (error) {
    res.status(500).json({ 
      error: error.message 
    });
  }
};