// Load environment variables FIRST
const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const passport = require('passport');
require('./config/passport');
const dns = require('dns');
const connectDB = require('./config/database');

// DNS workaround is only needed on local Windows machines; skip it on
// Linux / Vercel where it can interfere with resolution.
if (process.platform === 'win32') {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
  dns.setDefaultResultOrder('ipv4first');
}

const app = express();

// Middleware
// Raised limit so profile avatars (stored as base64 data URLs) fit in the body.
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// CORS — the frontend now lives on a different origin (Vercel), so allow the
// configured client URL(s). Comma-separate multiple origins if needed.
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());
app.use(cors({ origin: allowedOrigins, credentials: true }));

// Passport middleware
app.use(passport.initialize());

// Ensure the database is connected before handling any request. The connection
// is cached, so once warm this is effectively a no-op.
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/vouchers', require('./routes/voucherRoutes'));
app.use('/api/cart', require('./routes/cartRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running' });
});

// Start a real listener only when run directly (local dev / a normal server).
// On Vercel the app is imported as a serverless handler, so we must NOT listen.
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
