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
    
    // Register interaction handler directly
    const { InteractionType, ComponentType } = require('discord.js');
    
    client.on('interactionCreate', async (interaction) => {
      try {
        // Log raw interaction properties
        logger.debug(`INTERACTION OBJECT KEYS: ${Object.keys(interaction).join(', ')}`);
        logger.debug(`INTERACTION PROTOTYPE KEYS: ${Object.keys(Object.getPrototypeOf(interaction)).join(', ')}`);
        
        // Log basic interaction data
        logger.debug(`Direct handler - Received interaction: ${interaction.id}, type: ${interaction.type}, commandName: ${interaction.commandName || 'N/A'}`);
        
        // Check if we have a constructor name
        logger.debug(`Constructor name: ${interaction.constructor ? interaction.constructor.name : 'No constructor'}`);
        
        // Try to determine interaction type by checking properties
        if (interaction.commandName) {
          logger.debug('This appears to be a slash command interaction (has commandName)');
        } else if (interaction.customId) {
          logger.debug('This appears to be a component interaction (has customId)');
        }
        
        // Handle slash commands - check for commandName instead of type
        if (interaction.commandName) {
          logger.debug(`Processing slash command: ${interaction.commandName}`);
          
          // Get the command from the client.slashCommands collection
          const command = client.slashCommands.get(interaction.commandName);
          
          // If the command doesn't exist, log and return
          if (!command) {
            logger.warn(`Command not found in collection: ${interaction.commandName}`);
            return;
          }
          
          logger.debug(`Found command in collection: ${command.name}`);
          
          try {
            // Execute the command
            await command.execute(interaction, client);
          } catch (error) {
            logger.error(`Error executing command ${interaction.commandName}: ${error}`);
            
            // Check if the interaction has already been replied to or deferred
            if (interaction.replied || interaction.deferred) {
              await interaction.followUp({ 
                content: 'There was an error while executing this command!', 
                ephemeral: true 
              });
            } else {
              await interaction.reply({ 
                content: 'There was an error while executing this command!', 
                ephemeral: true 
              });
            }
          }
        }
      } catch (error) {
        logger.error(`Error in direct interactionCreate handler: ${error}`);
      }
    });
    
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