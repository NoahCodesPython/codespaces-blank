const fs = require('fs').promises;
const path = require('path');
const { Collection, REST, Routes } = require('discord.js');
const logger = require('../utils/logger');

/**
 * Load all command files 
 * @param {Client} client - Discord.js client
 */
const loadCommands = async (client) => {
  try {
    // Initialize collections if they don't exist
    client.commands = client.commands || new Collection();
    client.aliases = client.aliases || new Collection();
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
        
        // Add to commands collection (legacy commands)
        client.commands.set(command.name, command);
        
        // Register aliases for legacy commands
        if (command.aliases && Array.isArray(command.aliases)) {
          command.aliases.forEach(alias => {
            client.aliases.set(alias, command.name);
          });
        }
        
        // Register slash commands
        if (command.data) {
          client.slashCommands.set(command.data.name, command);
          slashCommands.push(command.data.toJSON());
        }
      }
    }
    
    logger.info(`Successfully loaded ${client.commands.size} legacy commands, ${client.aliases.size} aliases, and ${client.slashCommands.size} slash commands!`);
    
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
