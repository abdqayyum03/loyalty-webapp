const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

console.log('Initializing Google OAuth Strategy...');
console.log('Client ID:', process.env.GOOGLE_CLIENT_ID ? 'SET' : 'MISSING');
console.log('Client Secret:', process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'MISSING');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log('Google profile received:', profile.displayName, profile.emails[0].value);

        // Check if user exists with Google ID
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          console.log('User found by googleId:', user.username);
          return done(null, user);
        }

        // Check if user exists with email
        user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
          console.log('User found by email, linking googleId');
          user.googleId = profile.id;
          await user.save();
          return done(null, user);
        }

        // Create new user
        console.log('Creating new user from Google profile');
        const newUser = await User.create({
          googleId: profile.id,
          username: profile.displayName,
          email: profile.emails[0].value,
          password: 'oauth-google',
          is_active: true,
          points: 500,
        });

        console.log('New user created:', newUser.username);
        return done(null, newUser);
      } catch (error) {
        console.error('Error in Google strategy:', error);
        return done(error, null);
      }
    }
  )
);

// Serialize user
passport.serializeUser((user, done) => {
  console.log('Serializing user:', user._id);
  done(null, user.id);
});

// Deserialize user
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    console.log('Deserializing user:', user?.username);
    done(null, user);
  } catch (error) {
    console.error('Error deserializing user:', error);
    done(error, null);
  }
});

module.exports = passport;