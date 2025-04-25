require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const mongoose = require('mongoose');
const { loadCommands } = require('./src/handlers/command');
const { loadEvents } = require('./src/handlers/event');
const { initReminderHandler } = require('./src/handlers/reminderHandler');
const logger = require('./src/utils/logger');
const config = require('./src/config');

// Create Discord client with intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessageReactions
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.User,
    Partials.GuildMember
  ],
  allowedMentions: {
    parse: ['users', 'roles'],
    repliedUser: true
  }
});

// Client collections
client.commands = new Collection();
client.aliases = new Collection();
client.slashCommands = new Collection();
client.cooldowns = new Collection();

// Load bot configuration
client.config = config;

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      logger.warn('MongoDB URI not provided. Database functionality will not be available.');
      return;
    }
    
    await mongoose.connect(process.env.MONGO_URI);
    logger.info('Connected to MongoDB');
  } catch (error) {
    logger.error(`Error connecting to MongoDB: ${error.message}`);
    logger.warn('Continuing without database connection. Some features may not work.');
  }
};

// Initialize bot
const init = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Log in to Discord
    await client.login(process.env.TOKEN);
    logger.info(`Logged in as ${client.user.tag}`);
    
    // Load commands and events
    await loadCommands(client);
    await loadEvents(client);
    
    // Initialize reminder handler
    initReminderHandler(client);
    
    logger.info(`Aquire is serving ${client.guilds.cache.size} servers with ${client.users.cache.size} users`);
  } catch (error) {
    logger.error(`Error during initialization: ${error.message}`);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', error => {
  logger.error(`Unhandled promise rejection: ${error}`);
  console.error(error);
});

// Handle uncaught exceptions
process.on('uncaughtException', error => {
  logger.error(`Uncaught exception: ${error}`);
  console.error(error);
});

// Initialize the bot
init();