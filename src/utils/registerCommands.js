const { Routes } = require('discord.js');
const { REST } = require('@discordjs/rest');
const path = require('path');
const fs = require('fs').promises;
const logger = require('./logger');
require('dotenv').config();

/**
 * Registers slash commands with Discord API
 * @param {Client} client - Discord.js client
 */
async function registerCommands(client) {
  try {
    logger.info('Started refreshing slash commands...');

    const commands = [];
    const commandFolders = await fs.readdir(path.join(process.cwd(), 'src', 'commands'));

    // Loop through all categories
    for (const folder of commandFolders) {
      const commandFiles = await fs.readdir(path.join(process.cwd(), 'src', 'commands', folder))
        .then(files => files.filter(file => file.endsWith('.js')));

      // Loop through all command files in each category
      for (const file of commandFiles) {
        const command = require(path.join(process.cwd(), 'src', 'commands', folder, file));
        
        // Skip commands that don't have slash command data
        if (!command.data) continue;
        
        // Add to slash commands collection and commands array
        client.slashCommands.set(command.data.name, command);
        commands.push(command.data.toJSON());
      }
    }

    // Create REST instance
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

    // Register commands - globally or for test guild
    if (process.env.NODE_ENV === 'production') {
      // Global commands
      await rest.put(
        Routes.applicationCommands(client.user.id),
        { body: commands },
      );
      logger.info(`Successfully registered ${commands.length} global slash commands`);
    } else {
      // Guild commands (for testing)
      if (!client.config.server) {
        logger.warn('No test server ID provided in config. Skipping guild command registration.');
        return;
      }
      
      await rest.put(
        Routes.applicationGuildCommands(client.user.id, client.config.server),
        { body: commands },
      );
      logger.info(`Successfully registered ${commands.length} guild slash commands for development`);
    }
  } catch (error) {
    logger.error(`Error registering slash commands: ${error}`);
  }
}

module.exports = { registerCommands };
