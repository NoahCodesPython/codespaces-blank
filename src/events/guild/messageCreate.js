const { Events } = require('discord.js');
const logger = require('../../utils/logger');

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
      
      // We've removed the legacy command handling logic
      // This event now only handles automated features like:
      // - AFK status mentions (handled in afkMessage.js)
      // - Custom commands (handled in customCommandHandler.js)
      // - Auto responses (handled in autoResponseHandler.js)
      // - Invite/link filters (handled in their respective files)
      
      // If someone tries to use a legacy command with a prefix, inform them
      const defaultPrefix = process.env.PREFIX || '!';
      
      if (message.content.startsWith(defaultPrefix)) {
        const possibleCommand = message.content.slice(defaultPrefix.length).trim().split(/ +/)[0];
        
        // Only respond if it looks like they're trying to use a command (not just the prefix)
        if (possibleCommand && possibleCommand.length > 0) {
          // Log attempt to use legacy command
          logger.debug(`User attempted to use legacy command: ${possibleCommand}`);
          
          // Gentle message to inform about slash commands
          message.reply(`Legacy commands have been disabled. Please use slash commands (/) instead.`);
        }
      }
      
    } catch (error) {
      logger.error(`Error in messageCreate event: ${error}`);
    }
  }
};