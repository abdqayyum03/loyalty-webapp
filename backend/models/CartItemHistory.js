const mongoose = require('mongoose');

const cartItemHistorySchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Please provide a user ID'],
    },
    voucher_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Voucher',
      required: [true, 'Please provide a voucher ID'],
    },
    voucher_title: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    points_deducted: {
      type: Number,
      required: true,
    },
    order_date: {
      type: Date,
      default: Date.now,
    },
    pdf_generated: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CartItemHistory', cartItemHistorySchema);