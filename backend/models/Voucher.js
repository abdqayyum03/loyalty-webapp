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
    valid_until: {
      type: Date,
      default: null,
    },
    terms: {
      type: [String],
      default: [
        'Subject to voucher availability.',
        'Not exchangeable for cash.',
        'Cannot be combined with other promotions unless stated.',
        'Final redemption terms are confirmed during checkout.',
      ],
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    // Include computed virtuals (e.g. `is_valid`) whenever a voucher is
    // serialised to JSON or a plain object so the API reflects validity.
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Derived validity flag: a voucher is "valid" while it is active and has not
// passed its expiry date. Vouchers with no `valid_until` never expire. This is
// computed on read (not stored) so it can never go stale.
voucherSchema.virtual('is_valid').get(function () {
  if (!this.is_active) return false;
  if (!this.valid_until) return true;
  return new Date(this.valid_until).getTime() >= Date.now();
});

module.exports = mongoose.model('Voucher', voucherSchema);