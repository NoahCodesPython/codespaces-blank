const CustomCommand = require('../../models/CustomCommand');
const Guild = require('../../models/Guild');
const logger = require('../../utils/logger');

module.exports = {
  name: 'messageCreate',
  once: false,
  async execute(message, client) {
    try {
      // Ignore messages from bots and DMs
      if (message.author.bot || !message.guild) return;
      
      // Get guild settings for prefix
      const guildSettings = await Guild.findOne({ guildID: message.guild.id });
      
      // If no guild settings, use default prefix
      const prefix = guildSettings?.prefix || '!';
      
      // Check if message starts with prefix
      if (!message.content.startsWith(prefix)) return;
      
      // Extract command name
      const args = message.content.slice(prefix.length).trim().split(/ +/);
      const commandName = args.shift().toLowerCase();
      
      // Check if it's a built-in command (if so, don't process as custom command)
      if (client.commands.has(commandName) || client.aliases.has(commandName)) return;
      
      // Find custom command
      const customCommand = await CustomCommand.findOne({
        guildID: message.guild.id,
        name: commandName
      });
      
      // If command found, respond with it
      if (customCommand) {
        logger.debug(`Custom command "${commandName}" executed in ${message.guild.name}`);
        
        // Process placeholders in the response
        let response = customCommand.response;
        
        // Replace placeholders
        response = response
          .replace(/{user}/g, `<@${message.author.id}>`)
          .replace(/{username}/g, message.author.username)
          .replace(/{tag}/g, message.author.tag)
          .replace(/{server}/g, message.guild.name)
          .replace(/{membercount}/g, message.guild.memberCount);
        
        // Reply with the custom command response
        await message.channel.send(response);
      }
    } catch (error) {
      logger.error(`Error in custom command handler: ${error}`);
    }
  }
};