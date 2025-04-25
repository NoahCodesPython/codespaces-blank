const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const logger = require('./src/utils/logger');
const { registerCommands } = require('./src/utils/registerCommands');
const { connect } = require('./src/utils/mongoose');

// Load environment variables
require('dotenv').config();

// Load configuration
let config;
try {
  config = require('./config.json');
} catch (error) {
  logger.error('Config file not found. Please create a config.json file based on the template.');
  process.exit(1);
}

// Create new client instance with required intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.User,
    Partials.GuildMember,
    Partials.Reaction,
  ],
  allowedMentions: {
    parse: ['users', 'roles'],
    repliedUser: true,
  },
});

// Attach config to client
client.config = config;
client.commands = new Collection();
client.slashCommands = new Collection();
client.aliases = new Collection();
client.categories = fs.readdirSync(path.join(__dirname, 'src', 'commands'));
client.logger = logger;
client.cooldowns = new Collection();

// Load handlers
['command', 'event'].forEach(handler => {
  require(`./src/handlers/${handler}`)(client);
});

// Connect to MongoDB
connect().then(() => {
  logger.info('Connected to MongoDB');
}).catch(err => {
  logger.error(`MongoDB connection error: ${err}`);
});

// Register slash commands when bot is ready
client.once('ready', async () => {
  try {
    await registerCommands(client);
  } catch (error) {
    logger.error(`Error registering slash commands: ${error}`);
  }
});

// Handle errors
process.on('unhandledRejection', (error) => {
  logger.error(`Unhandled rejection: ${error}`);
  
  // If error webhook is configured, send error to webhook
  if (client.config.webhooks && client.config.webhooks.errors) {
    const webhookClient = require('./src/utils/webhook');
    webhookClient.send({
      content: `**Unhandled Rejection**\n\`\`\`${error.stack || error}\`\`\``
    }).catch(e => logger.error(`Failed to send error to webhook: ${e}`));
  }
});

// Login to Discord
client.login(process.env.TOKEN).catch(err => {
  logger.error(`Failed to login: ${err}`);
  process.exit(1);
});

module.exports = client;
