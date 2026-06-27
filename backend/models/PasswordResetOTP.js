const mongoose = require('mongoose');

// One-time code for the "forgot password" flow. Kept separate from the signup
// OTP model so the two flows never collide (a pending reset code can't be wiped
// by a new registration, and vice-versa). No username/password is stashed here —
// the account already exists; the user supplies the new password at verify time.
const passwordResetOTPSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
  },
  otp: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    index: { expires: 0 },
  },
});

module.exports = mongoose.model('PasswordResetOTP', passwordResetOTPSchema);
