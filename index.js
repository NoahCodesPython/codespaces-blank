/**
 * Aquire Bot - Main Entry Point
 * A versatile Discord bot that can run on multiple hosting platforms
 */

// Import required packages
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const fs = require('fs');
const mongoose = require('mongoose');
const config = require('./src/config');
const logger = require('./src/utils/logger');
const { startKeepAliveServer } = require('./src/utils/keepAlive');
const { connect } = require('./src/utils/mongoose');

// Create a new Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageReactions
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.Reaction,
    Partials.GuildMember,
    Partials.User
  ]
});

// Collections for storing commands and cooldowns
client.commands = new Collection();
client.cooldowns = new Collection();
client.slashCommands = new Collection();

// Bot configuration
client.config = config;

// Handler to load commands
const { loadCommands } = require('./src/handlers/command');
loadCommands(client);

// Handler to load events
const { loadEvents } = require('./src/handlers/event');
loadEvents(client);

// Initialize reminder handler
const { initReminderHandler } = require('./src/handlers/reminderHandler');
initReminderHandler(client);

// Start the keep-alive server for Replit and Glitch
if (config.platform === 'replit' || config.platform === 'glitch') {
  startKeepAliveServer();
}

// Connect to MongoDB
(async () => {
  try {
    await connect();
    logger.info('Connected to MongoDB');
    
    // Login to Discord
    client.login(config.token);
  } catch (error) {
    logger.error(`Failed to connect to MongoDB: ${error.message}`);
    process.exit(1);
  }
})();

// Start dashboard if enabled
if (config.dashboardEnabled) {
  try {
    const dashboard = require('./dashboard/app');
    // Pass the client instance to the dashboard
    dashboard.client = client;
    logger.info(`Dashboard started on port ${config.dashboardPort}`);
  } catch (error) {
    logger.error(`Failed to start dashboard: ${error.message}`);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  logger.error(`Unhandled promise rejection: ${error.message}`);
  console.error(error);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught exception: ${error.message}`);
  console.error(error);
});

// For stopping the bot gracefully
process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down...');
  
  // Disconnect from Discord
  client.destroy();
  
  // Disconnect from MongoDB
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
    logger.info('Disconnected from MongoDB');
  }
  
  process.exit(0);
});

module.exports = { client };