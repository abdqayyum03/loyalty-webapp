const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Admin Login
// @route   POST /api/admin/login
// @access  Public
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Please provide email and password',
      });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
      });
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({
        error: 'You do not have admin access',
      });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        error: 'Invalid credentials',
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        error: 'Admin account is inactive',
      });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};

// @desc    Get Dashboard Statistics
// @route   GET /api/admin/statistics
// @access  Private/Admin
exports.getDashboardStatistics = async (req, res) => {
  try {
    const CartItemHistory = require('../models/CartItemHistory');
    const Category = require('../models/Category');
    const Voucher = require('../models/Voucher');

    // Total users
    const totalUsers = await User.countDocuments({ role: 'user' });

    // Total orders
    const totalOrders = await CartItemHistory.countDocuments();

    // Total points redeemed
    const totalPointsRedeemed = await CartItemHistory.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: '$points_deducted' },
        },
      },
    ]);

    // Total vouchers
    const totalVouchers = await Voucher.countDocuments();

    // Total categories
    const totalCategories = await Category.countDocuments();

    // Recent orders (last 10)
    const recentOrders = await CartItemHistory.find()
      .populate('user_id', 'username email')
      .populate('voucher_id', 'title')
      .sort({ order_date: -1 })
      .limit(10);

    // Top redeemed vouchers
    const topVouchers = await CartItemHistory.aggregate([
      {
        $group: {
          _id: '$voucher_id',
          count: { $sum: 1 },
          totalPoints: { $sum: '$points_deducted' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'vouchers',
          localField: '_id',
          foreignField: '_id',
          as: 'voucherDetails',
        },
      },
    ]);

    res.status(200).json({
      success: true,
      statistics: {
        totalUsers,
        totalOrders,
        totalPointsRedeemed: totalPointsRedeemed[0]?.total || 0,
        totalVouchers,
        totalCategories,
      },
      recentOrders,
      topVouchers,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};

// @desc    Get All Users
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ role: 'user' })
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};

// @desc    Get All Orders
// @route   GET /api/admin/orders
// @access  Private/Admin
exports.getAllOrders = async (req, res) => {
  try {
    const CartItemHistory = require('../models/CartItemHistory');

    const orders = await CartItemHistory.find()
      .populate('user_id', 'username email points')
      .populate('voucher_id', 'title points')
      .sort({ order_date: -1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};

// @desc    Deactivate User
// @route   PUT /api/admin/users/:userId/deactivate
// @access  Private/Admin
exports.deactivateUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByIdAndUpdate(
      userId,
      { is_active: false },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({
      success: true,
      message: 'User deactivated successfully',
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};

// @desc    Activate User
// @route   PUT /api/admin/users/:userId/activate
// @access  Private/Admin
exports.activateUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByIdAndUpdate(
      userId,
      { is_active: true },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({
      success: true,
      message: 'User activated successfully',
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};