/**
 * Create (or promote) a superadmin account.
 *
 * Why this script exists: a superadmin can only be created by another
 * superadmin through the dashboard, so the *first* one has to be seeded. Adding
 * the user directly in MongoDB (Compass / mongosh) stores the password as
 * PLAINTEXT — login then fails because matchPassword() runs bcrypt.compare()
 * against a hash that isn't there. This script always sets the password through
 * the User model's pre('save') hook, so it is hashed correctly.
 *
 * Usage (PowerShell):
 *   node seeds/seedSuperAdmin.js <email> <password> [username]
 *   # or via env vars:
 *   $env:SUPERADMIN_EMAIL="boss@example.com"; $env:SUPERADMIN_PASSWORD="secret123"; node seeds/seedSuperAdmin.js
 *
 * Behaviour:
 *   - If a user with that email exists  → promote to superadmin, mark active,
 *     and (if a password was given) reset it.
 *   - If no such user exists            → create a new superadmin.
 */
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');

const run = async () => {
  // Args take priority, then env vars.
  const email    = process.argv[2] || process.env.SUPERADMIN_EMAIL;
  const password = process.argv[3] || process.env.SUPERADMIN_PASSWORD;
  const username = process.argv[4] || process.env.SUPERADMIN_USERNAME || 'superadmin';

  if (!email) {
    console.error('❌ Provide an email: node seeds/seedSuperAdmin.js <email> <password> [username]');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    let user = await User.findOne({ email });

    if (user) {
      // Promote an existing account.
      user.role = 'superadmin';
      user.is_active = true;
      if (password) user.password = password; // pre('save') hook re-hashes it
      await user.save();
      console.log(`✅ Promoted existing account to superadmin: ${email}`);
      if (password) console.log('   Password was reset (hashed).');
    } else {
      // Create a brand-new superadmin.
      if (!password) {
        console.error('❌ This email does not exist yet — a password is required to create it.');
        process.exit(1);
      }
      user = new User({
        username,
        email,
        password,           // pre('save') hook hashes it
        role: 'superadmin',
        is_active: true,
        points: 0,
      });
      await user.save();
      console.log(`✅ Created superadmin: ${email} (username: ${username})`);
    }

    console.log('\n📋 You can now sign in at http://localhost:3000/#admin');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed:', error.message);
    process.exit(1);
  }
};

run();
