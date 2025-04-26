/**
 * Configuration file for Aquire Bot
 * Supports multiple hosting environments: Replit, Heroku, Glitch, VPS, local hosting
 */

require('dotenv').config();

// Default configuration
const defaultConfig = {
  // Bot settings
  token: process.env.TOKEN,
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  ownerID: '788296234430889984', // Noah Osmont
  prefix: process.env.PREFIX || '!', // Default prefix

  // MongoDB connection
  mongoURI: process.env.MONGO_URI,

  // OpenAI API
  openAIKey: process.env.OPENAI_API_KEY,

  // Dashboard settings
  dashboardEnabled: process.env.DASHBOARD_ENABLED === 'true',
  dashboardPort: process.env.DASHBOARD_PORT || 3000,
  callbackURL: process.env.CALLBACK_URL || 'http://localhost:3000/auth/discord/callback',
  sessionSecret: process.env.SESSION_SECRET || 'default_secret',
  adminIDs: process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',') : [],

  // Webhook URLs for logging
  webhooks: {
    logs: process.env.LOGS_WEBHOOK,
    error: process.env.ERROR_WEBHOOK,
    join: process.env.JOIN_WEBHOOK,
    leave: process.env.LEAVE_WEBHOOK
  },

  // Activity settings
  activities: [
    { type: 'PLAYING', text: '{serverCount} servers | {prefix}help' },
    { type: 'WATCHING', text: '{userCount} users' },
    { type: 'LISTENING', text: '{prefix}help for commands' }
  ],
  activityInterval: 30000, // 30 seconds

  // Cooldown defaults (in milliseconds)
  cooldowns: {
    commands: 3000, // 3 seconds
    economy: 60000, // 1 minute
    moderationActions: 2000 // 2 seconds
  },

  // Default embed color
  embedColor: '#5865F2',

  // Debug mode
  debug: process.env.DEBUG === 'true',

  // Platform detection (useful for platform-specific code)
  platform: detectPlatform(),

  // Default message deletion timeout
  messageTimeout: 10000, // 10 seconds

  // Rate limit settings for commands
  rateLimit: {
    enabled: true,
    maxAttempts: 5,
    timeWindow: 60000 // 1 minute
  },

  // Default permissions for the bot
  permissions: '8', // Administrator

  // Default command categories
  categories: [
    'altdetector',
    'applications',
    'config',
    'economy',
    'fun',
    'information',
    'moderation',
    'owner',
    'reactionrole',
    'ticket',
    'utility'
  ]
};

/**
 * Detect the hosting platform
 * @returns {string} The detected platform (replit, heroku, glitch, vps, local)
 */
function detectPlatform() {
  // Check for Replit
  if (process.env.REPL_ID && process.env.REPL_OWNER) {
    return 'replit';
  }

  // Check for Heroku
  if (process.env.DYNO) {
    return 'heroku';
  }

  // Check for Glitch
  if (process.env.PROJECT_DOMAIN) {
    return 'glitch';
  }

  // Check for Docker environment
  if (process.env.DOCKER) {
    return 'docker';
  }

  // Default to VPS/local hosting if no platform detected
  return process.env.NODE_ENV === 'production' ? 'vps' : 'local';
}

/**
 * Platform-specific configurations
 */
const platformConfig = {
  replit: {
    // For keeping Replit alive
    keepAlive: true,
    dashboardPort: 3000, // Replit uses port 3000 by default
    callbackURL: process.env.REPLIT_URL ? `${process.env.REPLIT_URL}/auth/discord/callback` : defaultConfig.callbackURL
  },

  heroku: {
    // Heroku-specific settings
    keepAlive: false, // Not needed on Heroku
    dashboardPort: process.env.PORT, // Heroku sets the PORT environment variable
    callbackURL: process.env.HEROKU_APP_NAME ? `https://${process.env.HEROKU_APP_NAME}.herokuapp.com/auth/discord/callback` : defaultConfig.callbackURL
  },

  glitch: {
    // Glitch-specific settings
    keepAlive: true,
    dashboardPort: 3000, // Glitch uses port 3000 by default
    callbackURL: process.env.PROJECT_DOMAIN ? `https://${process.env.PROJECT_DOMAIN}.glitch.me/auth/discord/callback` : defaultConfig.callbackURL
  },

  docker: {
    // Docker-specific settings
    keepAlive: false, // Not needed in Docker
    dashboardPort: process.env.PORT || 3000
  },

  vps: {
    // VPS-specific settings
    keepAlive: false, // Not needed on VPS
    dashboardPort: process.env.PORT || 3000
  },

  local: {
    // Local development settings
    keepAlive: false, // Not needed for local development
    dashboardPort: 3000,
    debug: true // Enable debug mode by default in local development
  }
};

// Merge the platform-specific config with the default config
const platform = defaultConfig.platform;
const config = {
  ...defaultConfig,
  ...(platformConfig[platform] || {})
};

// For debugging purposes
if (config.debug) {
  console.log(`[CONFIG] Running on platform: ${platform}`);
  console.log(`[CONFIG] Dashboard ${config.dashboardEnabled ? 'enabled' : 'disabled'} on port ${config.dashboardPort}`);
}

module.exports = config;