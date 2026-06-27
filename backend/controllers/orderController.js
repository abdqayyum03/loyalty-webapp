const User = require('../models/User');
const CartItem = require('../models/CartItem');
const CartItemHistory = require('../models/CartItemHistory');
const Voucher = require('../models/Voucher');
const { generateOrderPDF } = require('../utils/generatePDF');
const { sendCheckoutEmail } = require('../utils/sendEmail');
const fs = require('fs');
const path = require('path');

// A voucher is expired once its (optional) valid_until date is in the past.
// Vouchers with no valid_until never expire.
const isVoucherExpired = (voucher) =>
  Boolean(voucher?.valid_until) && new Date(voucher.valid_until).getTime() < Date.now();

// @desc    Checkout - Redeem Vouchers
// @route   POST /api/orders/checkout
// @access  Private
exports.checkout = async (req, res) => {
  try {
    const userId = req.userId;

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get cart items
    const cartItems = await CartItem.find({ user_id: userId }).populate('voucher_id');

    if (cartItems.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Block checkout if any voucher in the cart has expired.
    const expiredItems = cartItems.filter((item) => isVoucherExpired(item.voucher_id));
    if (expiredItems.length > 0) {
      const titles = expiredItems.map((item) => item.voucher_id.title).join(', ');
      return res.status(400).json({
        error: `These vouchers have already expired and can no longer be redeemed: ${titles}. Please remove them from your cart.`,
        code: 'VOUCHER_EXPIRED',
      });
    }

    // Calculate total points needed
    const totalPoints = cartItems.reduce((sum, item) => sum + item.points_required, 0);

    // Check if user has enough points
    if (user.points < totalPoints) {
      return res.status(400).json({
        error: `Insufficient points. You need ${totalPoints - user.points} more points`,
      });
    }

    // Create history records for each item
    const historyRecords = [];
    for (const item of cartItems) {
      const historyRecord = await CartItemHistory.create({
        user_id: userId,
        voucher_id: item.voucher_id._id,
        voucher_title: item.voucher_id.title,
        quantity: item.quantity,
        points_deducted: item.points_required,
        order_date: new Date(),
      });
      historyRecords.push(historyRecord);
    }

    // Deduct points from user
    user.points -= totalPoints;
    await user.save();

    console.log(`✅ Points deducted: ${totalPoints}, Remaining: ${user.points}`);

    // Clear cart
    await CartItem.deleteMany({ user_id: userId });

    // Send confirmation email for each order
    try {
      for (const order of historyRecords) {
        await sendCheckoutEmail(order, user);
      }
      console.log('✅ All confirmation emails sent');
    } catch (emailError) {
      console.error('⚠️ Error sending confirmation emails:', emailError);
      // Don't fail the checkout if email fails - order is already created
    }

    res.status(200).json({
      success: true,
      message: 'Checkout successful - Confirmation email sent',
      orderDetails: {
        totalItems: cartItems.length,
        totalPoints,
        userRemainingPoints: user.points,
        orderId: historyRecords[0]?._id,
        // One record (and therefore one downloadable receipt) per voucher line,
        // so the redeem confirmation can offer a PDF for each item.
        orders: historyRecords.map((order) => ({
          orderId: order._id,
          voucherTitle: order.voucher_title,
          quantity: order.quantity,
          points: order.points_deducted,
        })),
      },
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        points: user.points,
      },
    });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: error.message });
  }
};

// @desc    Redeem a single voucher directly (skips the cart)
// @route   POST /api/orders/redeem
// @access  Private
exports.redeemNow = async (req, res) => {
  try {
    const userId = req.userId;
    const { voucher_id } = req.body;
    const quantity = Math.max(1, parseInt(req.body.quantity, 10) || 1);

    if (!voucher_id) {
      return res.status(400).json({ error: 'Please provide a voucher ID' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const voucher = await Voucher.findById(voucher_id);
    if (!voucher) {
      return res.status(404).json({ error: 'Voucher not found' });
    }

    // Reject redemption of an expired voucher.
    if (isVoucherExpired(voucher)) {
      return res.status(400).json({
        error: 'This voucher has already expired and can no longer be redeemed.',
        code: 'VOUCHER_EXPIRED',
      });
    }

    const totalPoints = quantity * voucher.points;

    // Check if user has enough points
    if (user.points < totalPoints) {
      return res.status(400).json({
        error: `Insufficient points. You need ${totalPoints - user.points} more points`,
      });
    }

    // Record the redemption (same history collection the cart checkout uses)
    const order = await CartItemHistory.create({
      user_id: userId,
      voucher_id: voucher._id,
      voucher_title: voucher.title,
      quantity,
      points_deducted: totalPoints,
      order_date: new Date(),
    });

    // Deduct points
    user.points -= totalPoints;
    await user.save();

    console.log(`✅ Redeemed "${voucher.title}" for ${totalPoints} pts, remaining: ${user.points}`);

    // Best-effort confirmation email — don't fail the redemption if it errors.
    try {
      await sendCheckoutEmail(order, user);
    } catch (emailError) {
      console.error('⚠️ Error sending redemption email:', emailError);
    }

    res.status(200).json({
      success: true,
      message: 'Voucher redeemed successfully',
      // Same shape as checkout so the frontend modal / receipt flow is shared.
      orderDetails: {
        totalItems: 1,
        totalPoints,
        userRemainingPoints: user.points,
        orderId: order._id,
        orders: [
          {
            orderId: order._id,
            voucherTitle: order.voucher_title,
            quantity: order.quantity,
            points: order.points_deducted,
          },
        ],
      },
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        points: user.points,
      },
    });
  } catch (error) {
    console.error('Redeem error:', error);
    res.status(500).json({ error: error.message });
  }
};

// @desc    Get User Order History
// @route   GET /api/orders/history
// @access  Private
exports.getOrderHistory = async (req, res) => {
  try {
    const userId = req.userId;

    const orders = await CartItemHistory.find({ user_id: userId })
      .populate('voucher_id', 'title description')
      .sort({ order_date: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Get Single Order
// @route   GET /api/orders/:orderId
// @access  Private
exports.getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.userId;

    const order = await CartItemHistory.findById(orderId).populate('voucher_id');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Verify order belongs to user
    if (order.user_id.toString() !== userId) {
      return res.status(403).json({ error: 'Not authorized to view this order' });
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Download Order PDF
// @route   GET /api/orders/:orderId/pdf
// @access  Private
exports.downloadOrderPDF = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.userId;

    // Find order
    const order = await CartItemHistory.findById(orderId);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Verify order belongs to user
    if (order.user_id.toString() !== userId) {
      return res.status(403).json({ error: 'Not authorized to download this PDF' });
    }

    // Find user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate PDF in memory and stream it back (no disk writes)
    const pdfBuffer = await generateOrderPDF(order, user);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Order-${orderId}.pdf"`,
    });
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF download error:', error);
    res.status(500).json({ error: error.message });
  }
};