/**
 * Backfill the `order_number` field on existing redemption records.
 *
 * New orders get an order_number automatically (CartItemHistory pre-save hook),
 * but records created before that field existed have it unset. This one-off
 * script stamps each of them with the SAME value the model would generate, so
 * the admin console and the PDF receipt show a consistent reference everywhere.
 *
 * Safe to run repeatedly — it only touches records that are still missing the
 * field, and the value is derived deterministically from each document's _id.
 *
 * Usage (PowerShell, from the backend folder):
 *   node seeds/backfillOrderNumbers.js
 */
const mongoose = require('mongoose');
require('dotenv').config();

const CartItemHistory = require('../models/CartItemHistory');

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Only records that don't have a usable order_number yet.
    const orders = await CartItemHistory.find({
      $or: [{ order_number: { $exists: false } }, { order_number: null }, { order_number: '' }],
    }).select('_id');

    if (orders.length === 0) {
      console.log('✨ Nothing to backfill — every order already has an order_number.');
    } else {
      const ops = orders.map((o) => ({
        updateOne: {
          filter: { _id: o._id },
          update: { $set: { order_number: CartItemHistory.buildOrderNumber(o._id) } },
        },
      }));

      const result = await CartItemHistory.bulkWrite(ops);
      console.log(`✅ Backfilled order_number on ${result.modifiedCount} order(s).`);
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Backfill failed:', error.message);
    process.exit(1);
  }
};

run();
