const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.adminAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    // Expose the caller's role so controllers can gate superadmin-only actions
    // (e.g. changing another account's role) without re-querying the database.
    req.userRole = user.role;

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};