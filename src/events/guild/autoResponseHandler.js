const AutoResponse = require('../../models/AutoResponse');
const logger = require('../../utils/logger');

module.exports = {
  name: 'messageCreate',
  once: false,
  async execute(message, client) {
    try {
      // Ignore messages from bots and DMs
      if (message.author.bot || !message.guild) return;
      
      // Get all auto-responses for this guild
      const autoResponses = await AutoResponse.find({ guildID: message.guild.id });
      
      // If no auto-responses, return early
      if (autoResponses.length === 0) return;
      
      // Check each auto-response
      for (const ar of autoResponses) {
        // Get message content based on case sensitivity
        const content = ar.caseSensitive ? message.content : message.content.toLowerCase();
        const trigger = ar.trigger; // This is already lowercase if not case sensitive (set during creation)
        
        let matches = false;
        
        // Check if trigger matches
        if (ar.exactMatch) {
          // For exact match, the entire message must match the trigger
          matches = content === trigger;
        } else {
          // For contains match, the message just needs to include the trigger
          matches = content.includes(trigger);
        }
        
        // If we have a match, send the response
        if (matches) {
          logger.debug(`Auto-response triggered in ${message.guild.name}: ${ar.trigger}`);
          
          // Process placeholders in the response
          let response = ar.response;
          
          // Replace placeholders
          response = response
            .replace(/{user}/g, `<@${message.author.id}>`)
            .replace(/{username}/g, message.author.username)
            .replace(/{tag}/g, message.author.tag)
            .replace(/{server}/g, message.guild.name)
            .replace(/{membercount}/g, message.guild.memberCount);
          
          // Send the response
          await message.channel.send(response);
          
          // Only trigger one auto-response per message
          break;
        }
      }
    } catch (error) {
      logger.error(`Error in auto-response handler: ${error}`);
    }
  }
};