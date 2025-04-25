const fs = require('fs').promises;
const path = require('path');
const { Collection, REST, Routes } = require('discord.js');
const logger = require('../utils/logger');

/**
 * Load all slash command files 
 * @param {Client} client - Discord.js client
 */
const loadCommands = async (client) => {
  try {
    // Initialize collection
    client.slashCommands = client.slashCommands || new Collection();
    
    const slashCommands = [];
    const commandFolders = await fs.readdir(path.join(__dirname, '..', 'commands'));
    
    logger.info(`Loading ${commandFolders.length} categories...`);

    for (const folder of commandFolders) {
      const commandFiles = await fs.readdir(path.join(__dirname, '..', 'commands', folder))
        .then(files => files.filter(file => file.endsWith('.js')));
      
      logger.info(`Loading ${commandFiles.length} commands from ${folder}...`);

      for (const file of commandFiles) {
        const command = require(path.join(__dirname, '..', 'commands', folder, file));
        const commandName = file.split('.')[0];
        
        // Set command name and category
        command.category = folder;
        command.name = command.data?.name || commandName;
        
        // Only register slash commands
        if (command.data) {
          client.slashCommands.set(command.data.name, command);
          slashCommands.push(command.data.toJSON());
        } else {
          logger.warn(`Command ${commandName} in ${folder} does not have slash command data and will be skipped.`);
        }
      }
    }
    
    logger.info(`Successfully loaded ${client.slashCommands.size} slash commands!`);
    
    // Register slash commands with Discord API
    if (slashCommands.length > 0) {
      const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
      
      try {
        logger.info('Started refreshing application (/) commands.');
        
        await rest.put(
          Routes.applicationCommands(client.user.id),
          { body: slashCommands }
        );
        
        logger.info(`Successfully registered ${slashCommands.length} application (/) commands.`);
      } catch (error) {
        logger.error(`Error registering slash commands: ${error}`);
      }
    }
  } catch (error) {
    logger.error(`Error loading commands: ${error}`);
  }
};

module.exports = { loadCommands };
