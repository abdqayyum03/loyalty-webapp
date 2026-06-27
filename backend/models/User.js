const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  googleId: { type: String, unique: true, sparse: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  phone: { type: String, default: '', trim: true },
  avatar: { type: String, default: '' },
  is_active: { type: Boolean, default: true },
  points: { type: Number, default: 0 },
  role: { type: String, enum: ['user', 'admin', 'superadmin'], default: 'user' },
  createdAt: { type: Date, default: Date.now },
});

// Static method to hash password
userSchema.statics.hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

// Instance method to match password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Hash the password whenever it is set or changed — single source of truth,
// so every save (register route, seed, controller) stores a hash, never plaintext.
// Mongoose 8+ treats an async hook as promise-based and does NOT pass `next`,
// so we simply return/await instead of calling next().
userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 10);
});

// Compare a plaintext candidate against the stored hash.
userSchema.methods.comparePassword = function (candidate) {
    return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);