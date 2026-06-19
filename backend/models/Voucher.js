const mongoose = require('mongoose');

const voucherSchema = new mongoose.Schema(
  {
    category_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Please provide a category'],
    },
    title: {
      type: String,
      required: [true, 'Please provide a voucher title'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please provide a description'],
    },
    points: {
      type: Number,
      required: [true, 'Please provide points required for redemption'],
    },
    image: {
      type: String,
      default: null,
    },
    quantity_available: {
      type: Number,
      default: 100,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Voucher', voucherSchema);