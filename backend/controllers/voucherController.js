const Voucher = require('../models/Voucher');

// @desc    Get all vouchers
// @route   GET /api/vouchers
// @access  Public
exports.getVouchers = async (req, res) => {
  try {
    const { category_id, is_active } = req.query;

    // Build filter
    let filter = {};
    if (category_id) filter.category_id = category_id;
    if (is_active !== undefined) filter.is_active = is_active === 'true';

    const vouchers = await Voucher.find(filter)
      .populate('category_id', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: vouchers.length,
      data: vouchers,
    });
  } catch (error) {
    res.status(500).json({ 
      error: error.message 
    });
  }
};

// @desc    Get single voucher
// @route   GET /api/vouchers/:id
// @access  Public
exports.getVoucher = async (req, res) => {
  try {
    const voucher = await Voucher.findById(req.params.id).populate(
      'category_id',
      'name'
    );

    if (!voucher) {
      return res.status(404).json({ 
        error: 'Voucher not found' 
      });
    }

    res.status(200).json({
      success: true,
      data: voucher,
    });
  } catch (error) {
    res.status(500).json({ 
      error: error.message 
    });
  }
};

// @desc    Get vouchers by category
// @route   GET /api/vouchers/category/:categoryId
// @access  Public
exports.getVouchersByCategory = async (req, res) => {
  try {
    const vouchers = await Voucher.find({
      category_id: req.params.categoryId,
      is_active: true,
    })
      .populate('category_id', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: vouchers.length,
      data: vouchers,
    });
  } catch (error) {
    res.status(500).json({ 
      error: error.message 
    });
  }
};

// @desc    Create voucher (Admin only)
// @route   POST /api/vouchers
// @access  Private/Admin
exports.createVoucher = async (req, res) => {
  try {
    const { category_id, title, description, points, quantity_available } =
      req.body;

    if (!category_id || !title || !description || !points) {
      return res.status(400).json({ 
        error: 'Please provide all required fields' 
      });
    }

    const voucher = await Voucher.create({
      category_id,
      title,
      description,
      points,
      quantity_available: quantity_available || 100,
    });

    res.status(201).json({
      success: true,
      data: voucher,
    });
  } catch (error) {
    res.status(500).json({ 
      error: error.message 
    });
  }
};