const User = require('../models/User');
const OTP = require('../models/OTP');
const jwt = require('jsonwebtoken');
const { generateOTP } = require('../utils/generateOTP');
const { sendOTPEmail } = require('../utils/sendEmail');

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

    // Create user with 500 welcome points
    const hashedPassword = await User.hashPassword(otpRecord.password);

    const user = new User({
      username: otpRecord.username,
      email: otpRecord.email,
      password: hashedPassword,
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

    const hashedPassword = await User.hashPassword(password);

    const user = new User({
      username,
      email,
      password: hashedPassword,
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
        points: 500, // ✅ Welcome bonus points
        is_active: true,
        role: 'user',
      });

      console.log(`✅ New user created via Google: ${user.email} with 500 welcome points`);
    }

    // Generate token
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