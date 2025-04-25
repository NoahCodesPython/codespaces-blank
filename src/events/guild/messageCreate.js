const { Events, PermissionFlagsBits } = require('discord.js');
const logger = require('../../utils/logger');
const Guild = require('../../models/Guild');

module.exports = {
  name: Events.MessageCreate,
  async execute(message, client) {
    try {
      // Ignore undefined messages or those without author
      if (!message || !message.author) return;
      
      // Ignore messages from bots
      if (message.author.bot) return;
      
      // Ignore DMs
      if (!message.guild) return;
      
      // Get guild configuration
      let guildSettings;
      try {
        guildSettings = await Guild.findOne({ guildID: message.guild.id });
        
        // If no config exists, create a default one
        if (!guildSettings) {
          guildSettings = await Guild.create({
            guildID: message.guild.id,
            prefix: process.env.PREFIX || '!'
          });
        }
      } catch (error) {
        logger.error(`Error fetching guild settings: ${error}`);
        // Default prefix if DB fails
        guildSettings = { prefix: process.env.PREFIX || '!' };
      }
      
      // Check if message starts with prefix
      const prefix = guildSettings.prefix;
      if (!message.content.startsWith(prefix)) return;
      
      // Parse command and arguments
      const args = message.content.slice(prefix.length).trim().split(/ +/);
      const commandName = args.shift().toLowerCase();
      
      // Debug logging
      logger.debug(`Command called: ${commandName}, Args: ${args.join(', ')}`);
      logger.debug(`Available commands: ${[...client.commands.keys()].join(', ')}`);
      logger.debug(`Available aliases: ${[...client.aliases.keys()].join(', ')}`);
      
      // Get command from collection
      let command = client.commands.get(commandName);
      
      // If not found, check aliases
      if (!command) {
        const aliasedName = client.aliases.get(commandName);
        if (aliasedName) {
          command = client.commands.get(aliasedName);
          logger.debug(`Found command via alias: ${commandName} -> ${aliasedName}`);
        }
      }
      
      // If no command found, return
      if (!command) {
        logger.debug(`Command not found: ${commandName}`);
        return;
      }
      
      logger.debug(`Executing command: ${command.name}`);
      
      // Check if command is for guild only
      if (command.guildOnly && !message.guild) {
        return message.reply('This command can only be used in a server.');
      }
      
      // Check if user has required permissions
      if (command.userPermissions && command.userPermissions.length) {
        const missingPerms = command.userPermissions.filter(perm => {
          return !message.member.permissions.has(perm);
        });
        
        if (missingPerms.length) {
          return message.reply({
            content: `You need the following permissions to use this command: ${missingPerms.join(', ')}`
          });
        }
      }
      
      // Check if bot has required permissions
      if (command.botPermissions && command.botPermissions.length) {
        const me = message.guild.members.me || await message.guild.members.fetchMe();
        const missingPerms = command.botPermissions.filter(perm => {
          return !me.permissions.has(perm);
        });
        
        if (missingPerms.length) {
          return message.reply({
            content: `I need the following permissions to execute this command: ${missingPerms.join(', ')}`
          });
        }
      }
      
      // Execute command
      try {
        logger.debug(`Running command handler for: ${command.name}`);
        
        // Check if the run method exists
        if (typeof command.run !== 'function') {
          logger.error(`Command ${command.name} does not have a run method`);
          return message.reply('This command cannot be executed at this time.');
        }
        
        await command.run(client, message, args);
        logger.debug(`Successfully executed command: ${command.name}`);
      } catch (error) {
        logger.error(`Error executing command ${commandName}: ${error}`);
        logger.error(error.stack); // Log the full stack trace
        message.reply('There was an error trying to execute that command!');
      }
      
    } catch (error) {
      logger.error(`Error in messageCreate event: ${error}`);
    }
  }
};