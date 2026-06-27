const mongoose = require('mongoose');

// Build the canonical, human-friendly order reference from a document id. Kept
// as a standalone helper so the same value can be recomputed on the fly for
// legacy records that pre-date the persisted `order_number` field — the PDF
// receipt and the admin console both derive it the identical way.
const buildOrderNumber = (id) => `ORD-${String(id).slice(-8).toUpperCase()}`;

const cartItemHistorySchema = new mongoose.Schema(
  {
    // Stable receipt/order reference shown in the admin console AND on the PDF
    // receipt. Generated once from the document's own _id (see pre-save hook).
    order_number: {
      type: String,
      index: true,
    },
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

// Assign the order number from the document's own _id before the first save.
// Mongoose has already generated _id by this point, so the value is stable and
// unique without needing a separate counter.
// NB: Mongoose 8+/9 treats this hook as sync (it does NOT pass `next`), so we
// just set the field and return — calling next() would throw "next is not a
// function" (same migration as the User model's password hook).
cartItemHistorySchema.pre('save', function () {
  if (!this.order_number && this._id) {
    this.order_number = buildOrderNumber(this._id);
  }
});

// Exported so seeds / one-off scripts can backfill the same value.
cartItemHistorySchema.statics.buildOrderNumber = buildOrderNumber;

module.exports = mongoose.model('CartItemHistory', cartItemHistorySchema);