const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema(
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
    quantity: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
    points_required: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CartItem', cartItemSchema);