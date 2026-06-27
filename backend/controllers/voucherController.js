const Voucher = require('../models/Voucher');

// @desc    Get all vouchers
// @route   GET /api/vouchers
// @access  Public
exports.getVouchers = async (req, res) => {
  try {
    const vouchers = await Voucher.find().populate('category_id', 'name');

    res.status(200).json({
      success: true,
      count: vouchers.length,
      data: vouchers,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Get single voucher
// @route   GET /api/vouchers/:id
// @access  Public
exports.getVoucherById = async (req, res) => {
  try {
    const voucher = await Voucher.findById(req.params.id).populate(
      'category_id',
      'name'
    );

    if (!voucher) {
      return res.status(404).json({ error: 'Voucher not found' });
    }

    res.status(200).json({
      success: true,
      data: voucher,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Get vouchers by category
// @route   GET /api/vouchers/category/:categoryId
// @access  Public
exports.getVouchersByCategory = async (req, res) => {
  try {
    const vouchers = await Voucher.find({
      category_id: req.params.categoryId,
    }).populate('category_id', 'name');

    res.status(200).json({
      success: true,
      count: vouchers.length,
      data: vouchers,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Create voucher (Admin only)
// @route   POST /api/vouchers
// @access  Private/Admin
exports.createVoucher = async (req, res) => {
  try {
    const {
      category_id,
      points,
      title,
      description,
      quantity_available,
      image,
      is_active,
      valid_until,
      terms,
    } = req.body;

    if (!category_id || !points || !title) {
      return res.status(400).json({
        error: 'Please provide category_id, points, and title',
      });
    }

    // Only keep non-empty term lines; when none are provided let the schema
    // default supply the standard set.
    const cleanTerms = Array.isArray(terms)
      ? terms.map((t) => String(t).trim()).filter(Boolean)
      : undefined;

    const voucher = await Voucher.create({
      category_id,
      points,
      title,
      description: description || '',
      quantity_available: quantity_available || 100,
      image: image || null,
      is_active: is_active !== undefined ? is_active : true,
      valid_until: valid_until || null,
      ...(cleanTerms && cleanTerms.length > 0 ? { terms: cleanTerms } : {}),
    });

    console.log(`✅ Voucher created: ${voucher.title}`);

    res.status(201).json({
      success: true,
      message: 'Voucher created successfully',
      data: voucher,
    });
  } catch (error) {
    console.error('Create voucher error:', error);
    res.status(500).json({ error: error.message });
  }
};

// @desc    Update voucher (Admin only)
// @route   PUT /api/vouchers/:id
// @access  Private/Admin
exports.updateVoucher = async (req, res) => {
  try {
    const {
      category_id,
      points,
      title,
      description,
      quantity_available,
      image,
      is_active,
      valid_until,
      terms,
    } = req.body;

    const cleanTerms = Array.isArray(terms)
      ? terms.map((t) => String(t).trim()).filter(Boolean)
      : undefined;

    const voucher = await Voucher.findByIdAndUpdate(
      req.params.id,
      {
        category_id,
        points,
        title,
        description,
        quantity_available,
        image,
        is_active,
        valid_until: valid_until || null,
        ...(cleanTerms ? { terms: cleanTerms } : {}),
      },
      { new: true, runValidators: true }
    );

    if (!voucher) {
      return res.status(404).json({ error: 'Voucher not found' });
    }

    console.log(`✅ Voucher updated: ${voucher.title}`);

    res.status(200).json({
      success: true,
      message: 'Voucher updated successfully',
      data: voucher,
    });
  } catch (error) {
    console.error('Update voucher error:', error);
    res.status(500).json({ error: error.message });
  }
};

// @desc    Delete voucher (Admin only)
// @route   DELETE /api/vouchers/:id
// @access  Private/Admin
exports.deleteVoucher = async (req, res) => {
  try {
    const voucher = await Voucher.findByIdAndDelete(req.params.id);

    if (!voucher) {
      return res.status(404).json({ error: 'Voucher not found' });
    }

    console.log(`✅ Voucher deleted: ${voucher.title}`);

    res.status(200).json({
      success: true,
      message: 'Voucher deleted successfully',
      data: voucher,
    });
  } catch (error) {
    console.error('Delete voucher error:', error);
    res.status(500).json({ error: error.message });
  }
};