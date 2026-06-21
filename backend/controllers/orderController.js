const User = require('../models/User');
const CartItem = require('../models/CartItem');
const CartItemHistory = require('../models/CartItemHistory');
const { generateOrderPDF } = require('../utils/generatePDF');
const { sendCheckoutEmail } = require('../utils/sendEmail');
const fs = require('fs');
const path = require('path');

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

    // Generate PDF
    const filename = await generateOrderPDF(order, user);

    const filepath = path.join(__dirname, '../pdfs', filename);

    // Send file
    res.download(filepath, `Order-${orderId}.pdf`, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
      }

      // Delete file after download
      fs.unlink(filepath, (unlinkErr) => {
        if (unlinkErr) console.error('Error deleting PDF:', unlinkErr);
      });
    });
  } catch (error) {
    console.error('PDF download error:', error);
    res.status(500).json({ error: error.message });
  }
};