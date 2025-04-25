const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const logger = require('../../src/utils/logger');
const { User } = require('../../src/models/User');

// Define the scopes we need from Discord
const scopes = ['identify', 'guilds'];

// Strategy configuration
passport.use(new DiscordStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: process.env.CALLBACK_URL || 'http://localhost:5000/auth/discord/callback',
  scope: scopes
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Find or create user in database
    let user = await User.findOne({ discordId: profile.id });
    
    if (!user) {
      user = new User({
        discordId: profile.id,
        username: profile.username,
        discriminator: profile.discriminator,
        avatar: profile.avatar,
        guilds: profile.guilds
      });
      
      await user.save();
      logger.info(`New user created in database: ${profile.username}#${profile.discriminator}`);
    } else {
      // Update user information
      user.username = profile.username;
      user.discriminator = profile.discriminator;
      user.avatar = profile.avatar;
      user.guilds = profile.guilds;
      
      await user.save();
      logger.debug(`User updated in database: ${profile.username}#${profile.discriminator}`);
    }
    
    // Store tokens in user session
    user.accessToken = accessToken;
    user.refreshToken = refreshToken;
    
    return done(null, user);
  } catch (err) {
    logger.error(`Error in Discord authentication: ${err.message}`);
    return done(err, null);
  }
}));

// Serialize user to store in session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    logger.error(`Error deserializing user: ${err.message}`);
    done(err, null);
  }
});