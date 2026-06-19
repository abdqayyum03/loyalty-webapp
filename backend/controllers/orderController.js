const CartItem = require('../models/CartItem');
const CartItemHistory = require('../models/CartItemHistory');
const User = require('../models/User');

exports.checkout = async (req, res) => {
  try {
    const cartItems = await CartItem.find({ user_id: req.userId }).populate(
      'voucher_id'
    );

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const totalPoints = cartItems.reduce(
      (sum, item) => sum + item.points_required,
      0
    );

    if (user.points < totalPoints) {
      return res.status(400).json({ error: 'Insufficient points for redemption' });
    }

    const historyItems = [];
    for (let item of cartItems) {
      const historyItem = await CartItemHistory.create({
        user_id: req.userId,
        voucher_id: item.voucher_id._id,
        voucher_title: item.voucher_id.title,
        quantity: item.quantity,
        points_deducted: item.points_required,
        order_date: new Date(),
      });
      historyItems.push(historyItem);
    }

    user.points -= totalPoints;
    await user.save();

    await CartItem.deleteMany({ user_id: req.userId });

    return res.status(200).json({
      success: true,
      message: 'Checkout successful',
      orderDetails: {
        totalItems: cartItems.length,
        totalPoints: totalPoints,
        userRemainingPoints: user.points,
        orderId: historyItems[0]._id,
      },
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return res.status(500).json({ error: error.message });
  }
};

exports.getOrderHistory = async (req, res) => {
  try {
    const orders = await CartItemHistory.find({ user_id: req.userId })
      .populate('voucher_id', 'title description image')
      .sort({ order_date: -1 });

    return res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    console.error('Get order history error:', error);
    return res.status(500).json({ error: error.message });
  }
};

exports.getOrderDetails = async (req, res) => {
  try {
    const firstOrderItem = await CartItemHistory.findOne({
      _id: req.params.orderId,
      user_id: req.userId,
    });

    if (!firstOrderItem) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const orderItems = await CartItemHistory.find({
      user_id: req.userId,
      order_date: {
        $gte: new Date(firstOrderItem.order_date.getTime() - 1000),
        $lte: new Date(firstOrderItem.order_date.getTime() + 1000),
      },
    }).populate('voucher_id', 'title description image');

    return res.status(200).json({
      success: true,
      data: orderItems,
    });
  } catch (error) {
    console.error('Get order details error:', error);
    return res.status(500).json({ error: error.message });
  }
};