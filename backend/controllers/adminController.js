const User = require('../models/User');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { generateOrderPDF } = require('../utils/generatePDF');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// Role hierarchy — a higher number outranks a lower one.
const ROLE_RANK = { user: 1, admin: 2, superadmin: 3 };

// True when `actorRole` may manage an account with `targetRole`, i.e. the target
// does NOT outrank the actor (equal rank is allowed).
const canManageTarget = (actorRole, targetRole) =>
  (ROLE_RANK[actorRole] || 0) >= (ROLE_RANK[targetRole] || 0);

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

    // Check if user can access the admin dashboard (admin or superadmin)
    if (user.role !== 'admin' && user.role !== 'superadmin') {
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

    // Total active accounts (any role: user, admin or superadmin)
    const totalActiveAccounts = await User.countDocuments({ is_active: true });

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
        totalActiveAccounts,
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
    // Return every account (users *and* admins) so role management can both
    // promote and demote. The dashboard "Total Users" stat is a separate query
    // that still counts only regular users.
    const users = await User.find()
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

    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Can't deactivate an account that outranks you.
    if (!canManageTarget(req.userRole, user.role)) {
      return res.status(403).json({
        error: 'You cannot deactivate an account with a higher role than yours.',
      });
    }

    user.is_active = false;
    await user.save();

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

    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Can't activate an account that outranks you.
    if (!canManageTarget(req.userRole, user.role)) {
      return res.status(403).json({
        error: 'You cannot activate an account with a higher role than yours.',
      });
    }

    user.is_active = true;
    await user.save();

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

// @desc    Update User Role
// @route   PUT /api/admin/users/:userId/role
// @access  Private/Admin
exports.updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    // Only a superadmin is allowed to change account roles.
    if (req.userRole !== 'superadmin') {
      return res.status(403).json({
        error: 'Only a superadmin can change account roles.',
      });
    }

    // Only the roles defined on the User schema are allowed.
    const allowedRoles = ['user', 'admin', 'superadmin'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        error: 'Invalid role. Must be "user", "admin" or "superadmin".',
      });
    }

    // Guard against a superadmin demoting (and locking out) themselves.
    if (String(req.userId) === String(userId)) {
      return res.status(400).json({
        error: 'You cannot change your own role.',
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({
      success: true,
      message: `User role updated to ${role}`,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};

// @desc    Download an order's receipt PDF (admin)
// @route   GET /api/admin/orders/:orderId/pdf
// @access  Private/Admin
// We never persist the PDF itself — only the redemption record. The receipt is
// regenerated on demand from that record whenever an admin asks for it.
exports.downloadOrderPDF = async (req, res) => {
  try {
    const CartItemHistory = require('../models/CartItemHistory');
    const { orderId } = req.params;

    const order = await CartItemHistory.findById(orderId).populate(
      'user_id',
      'username email'
    );

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // The PDF generator reads username/email off the user object. Fall back to a
    // placeholder if the account was since deleted, so a missing user never 500s.
    const user = order.user_id || { username: 'Unknown user', email: '—' };

    const pdfBuffer = await generateOrderPDF(order, user);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Order-${orderId}.pdf"`,
    });
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Admin PDF download error:', error);
    res.status(500).json({ error: error.message });
  }
};