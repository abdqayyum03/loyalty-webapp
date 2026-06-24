const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

console.log('Initializing Google OAuth Strategy...');
console.log('Client ID:', process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET');
console.log('Client Secret:', process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log('🔐 Google Profile Received:');
        console.log('   ID:', profile.id);
        console.log('   Display Name:', profile.displayName);
        console.log('   Emails:', profile.emails);
        console.log('   Email:', profile.email);

        // Store full profile for use in callback
        const userProfile = {
          id: profile.id,
          displayName: profile.displayName,
          name: profile.name ? `${profile.name.givenName} ${profile.name.familyName}`.trim() : profile.displayName,
          email: profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null,
          emails: profile.emails || [],
          photos: profile.photos || [],
        };

        console.log('✅ Processed Profile:', JSON.stringify(userProfile, null, 2));

        return done(null, userProfile);
      } catch (error) {
        console.error('❌ Error in Google strategy:', error);
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});