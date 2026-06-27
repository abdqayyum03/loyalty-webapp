const User = require('../models/User');
const OTP = require('../models/OTP');
const PasswordResetOTP = require('../models/PasswordResetOTP');
const jwt = require('jsonwebtoken');
const { generateOTP } = require('../utils/generateOTP');
const { sendOTPEmail, sendPasswordResetEmail } = require('../utils/sendEmail');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Send OTP to email for registration
// @route   POST /api/auth/send-otp
// @access  Public
exports.sendOTP = async (req, res) => {
  try {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({
        error: 'Please provide email, username, and password',
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'Email or username already registered',
      });
    }

    // Delete any previous OTP for this email
    await OTP.deleteMany({ email });

    // Generate OTP
    const otp = generateOTP();
    console.log(`📧 Generated OTP for ${email}: ${otp}`);

    // Save OTP temporarily
    await OTP.create({
      email,
      username,
      password,
      otp,
    });

    // Send OTP email
    await sendOTPEmail(email, otp, username);

    res.status(200).json({
      success: true,
      message: 'OTP sent to your email. Valid for 10 minutes.',
      email,
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: error.message });
  }
};

// @desc    Verify OTP and complete registration
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        error: 'Please provide email and OTP',
      });
    }

    // Find OTP record
    const otpRecord = await OTP.findOne({ email, otp });

    if (!otpRecord) {
      return res.status(400).json({
        error: 'Invalid or expired OTP',
      });
    }

    // Check if OTP is expired
    if (new Date() > otpRecord.expiresAt) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        error: 'OTP has expired. Please request a new one.',
      });
    }

    // Create user with 500 welcome points. Assign the password in plaintext —
    // the User model's pre-save hook hashes it once. Hashing here too would
    // double-hash the password and break login ("Invalid credentials").
    const user = new User({
      username: otpRecord.username,
      email: otpRecord.email,
      password: otpRecord.password,
      points: 500, // ✅ CHANGED FROM 0 TO 500 - Welcome bonus points
      is_active: true,
      role: 'user',
    });

    await user.save();
    console.log(`✅ User registered: ${user.email} with 500 welcome points`);

    // Delete OTP record
    await OTP.deleteOne({ _id: otpRecord._id });

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        points: 500, // ✅ Return points in response
      },
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: error.message });
  }
};

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Please provide email' });
    }

    // Find OTP record
    const otpRecord = await OTP.findOne({ email });

    if (!otpRecord) {
      return res.status(400).json({
        error: 'No registration found for this email',
      });
    }

    // Generate new OTP
    const newOtp = generateOTP();
    otpRecord.otp = newOtp;
    otpRecord.expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await otpRecord.save();

    console.log(`📧 Resent OTP for ${email}: ${newOtp}`);

    // Send OTP email
    await sendOTPEmail(email, newOtp, otpRecord.username);

    res.status(200).json({
      success: true,
      message: 'New OTP sent to your email',
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ error: error.message });
  }
};

// @desc    Register User (Old method - kept for compatibility)
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        error: 'Please provide username, email, and password',
      });
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'Email or username already registered',
      });
    }

    // Assign the password in plaintext — the User model's pre-save hook hashes
    // it once. Hashing here too would double-hash and break login.
    const user = new User({
      username,
      email,
      password,
      points: 500, // ✅ Welcome bonus points
      is_active: true,
      role: 'user',
    });

    await user.save();
    console.log(`✅ User registered: ${user.email} with 500 welcome points`);

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        points: 500, // ✅ Return points in response
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message });
  }
};

// @desc    Login User
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Please provide email and password',
      });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
      });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        error: 'Invalid credentials',
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        error: 'Account is inactive',
      });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        points: user.points,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
};

// @desc    Send a password-reset code to the account's email
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Please provide your email address' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    // We tell the user the account doesn't exist (matching the rest of the
    // app's clear-error style, e.g. signup). If email enumeration ever becomes
    // a concern, return a generic success here regardless of `user`.
    if (!user) {
      return res.status(404).json({
        error: 'No account found with that email address',
      });
    }

    // Replace any previous reset code for this email.
    await PasswordResetOTP.deleteMany({ email: normalizedEmail });

    const otp = generateOTP();
    console.log(`🔑 Generated password-reset OTP for ${normalizedEmail}: ${otp}`);

    await PasswordResetOTP.create({ email: normalizedEmail, otp });

    await sendPasswordResetEmail(normalizedEmail, otp, user.username);

    res.status(200).json({
      success: true,
      message: 'A password-reset code has been sent to your email. Valid for 10 minutes.',
      email: normalizedEmail,
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: error.message });
  }
};

// @desc    Verify the reset code and set a new password
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        error: 'Please provide email, the reset code, and a new password',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: 'New password must be at least 6 characters',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const otpRecord = await PasswordResetOTP.findOne({ email: normalizedEmail, otp });
    if (!otpRecord) {
      return res.status(400).json({ error: 'Invalid or expired reset code' });
    }

    if (new Date() > otpRecord.expiresAt) {
      await PasswordResetOTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        error: 'Reset code has expired. Please request a new one.',
      });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      await PasswordResetOTP.deleteOne({ _id: otpRecord._id });
      return res.status(404).json({ error: 'Account no longer exists' });
    }

    // Assign in plaintext — the User model's pre-save hook hashes it once.
    user.password = newPassword;
    await user.save();
    console.log(`✅ Password reset for ${user.email}`);

    // Burn the code so it can't be reused.
    await PasswordResetOTP.deleteOne({ _id: otpRecord._id });

    res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now sign in with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: error.message });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Update the signed-in user's profile
// @route   PATCH /api/auth/me
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { username, email, phone, avatar, currentPassword, newPassword } = req.body;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Username — must stay unique across other accounts.
    if (username && username !== user.username) {
      const taken = await User.findOne({ username, _id: { $ne: user._id } });
      if (taken) {
        return res.status(400).json({ error: 'That username is already taken' });
      }
      user.username = username;
    }

    // Email — also unique across other accounts.
    if (email && email !== user.email) {
      const taken = await User.findOne({ email, _id: { $ne: user._id } });
      if (taken) {
        return res.status(400).json({ error: 'That email is already registered' });
      }
      user.email = email;
    }

    if (phone !== undefined) user.phone = phone;
    if (avatar !== undefined) user.avatar = avatar;

    // Optional password change — verify the current one first. The model's
    // pre-save hook hashes the new value, so we assign it in plaintext.
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Enter your current password to set a new one' });
      }
      if (!user.password) {
        return res.status(400).json({ error: 'This account has no password set' });
      }
      const isMatch = await user.matchPassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
      user.password = newPassword;
    }

    await user.save();
    console.log(`✅ Profile updated: ${user.email}`);

    // Never return the password hash to the client.
    const safe = user.toObject();
    delete safe.password;

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: safe,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: error.message });
  }
};

// @desc    Verify OTP for a first-time Google sign-in and create the account
// @route   POST /api/auth/verify-google-otp
// @access  Public
exports.verifyGoogleOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Please provide email and OTP' });
    }

    const otpRecord = await OTP.findOne({ email, otp });
    if (!otpRecord) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    if (new Date() > otpRecord.expiresAt) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    // The account may already exist if the user retried — reuse it rather than
    // hitting the unique-email constraint.
    let user = await User.findOne({ email: otpRecord.email });
    if (!user) {
      user = new User({
        googleId: otpRecord.googleId,
        username: otpRecord.username,
        email: otpRecord.email,
        password: otpRecord.password || 'oauth-google',
        points: 500, // welcome bonus, matching the regular signup flow
        is_active: true,
        role: 'user',
      });
      await user.save();
      console.log(`✅ Google account created via OTP: ${user.email}`);
    }

    await OTP.deleteOne({ _id: otpRecord._id });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        points: user.points,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Verify Google OTP error:', error);
    res.status(500).json({ error: error.message });
  }
};

// @desc    Google OAuth Callback
// @route   GET /api/auth/google/callback
// @access  Public
exports.googleCallback = async (req, res) => {
  try {
    console.log('🔐 Full Google Profile:');
    console.log(JSON.stringify(req.user, null, 2));

    // Extract user data - handle different possible structures
    const id = req.user.id || req.user.sub;
    const displayName = req.user.displayName || req.user.name || 'Google User';
    const emails = req.user.emails || [];
    const email = req.user.email;

    console.log('📊 Extracted data:', { id, displayName, emailsCount: emails.length, email });

    // Determine the actual email to use
    let userEmail = null;
    if (emails && emails.length > 0) {
      userEmail = emails[0].value;
    } else if (email) {
      userEmail = email;
    }

    console.log('✉️ User email:', userEmail);

    // Handle missing email
    if (!userEmail) {
      console.error('❌ No email found in Google profile');
      return res.redirect(
        `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=no_email`
      );
    }

    // Find user by googleId
    let user = await User.findOne({ googleId: id });

    if (user) {
      console.log(`✅ Existing user found with googleId: ${user.email}`);
    } else {
      console.log('👤 New user - checking if email already exists...');

      // Check if email already exists (from regular registration)
      const existingUser = await User.findOne({ email: userEmail });
      if (existingUser) {
        console.log(`⚠️ Email already registered: ${userEmail}`);
        return res.redirect(
          `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=email_exists`
        );
      }

      // Create new user with 500 welcome points
      user = await User.create({
        googleId: id,
        username: displayName,
        email: userEmail,
        password: 'oauth-google',
        is_active: true,
        points: 500, // ✅ Welcome bonus points
        role: 'user',
      });

      console.log(`✅ New user created via Google: ${user.email} with 500 welcome points`);
    }

    const token = generateToken(user._id);

    // Build redirect URL with query parameters
    const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/google/success?token=${token}&username=${encodeURIComponent(user.username)}&email=${encodeURIComponent(user.email)}&points=${user.points}`;

    console.log('🚀 Redirecting to:', redirectUrl);
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('❌ Google callback error:', error);

    // Redirect to login with error message
    res.redirect(
      `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=${encodeURIComponent(error.message)}`
    );
  }
};