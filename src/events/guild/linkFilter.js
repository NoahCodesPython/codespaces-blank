const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Guild = require('../../models/Guild');
const logger = require('../../utils/logger');

module.exports = {
  name: 'messageCreate',
  once: false,
  async execute(message, client) {
    try {
      // Ignore messages from bots and DMs
      if (message.author.bot || !message.guild) return;
      
      // Check if the user has manage messages permission (bypass filter)
      if (message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return;
      
      // Find guild settings
      const guildSettings = await Guild.findOne({ guildID: message.guild.id });
      
      // If no settings or anti-links is disabled, ignore
      if (!guildSettings || !guildSettings.antiLinks) return;
      
      // Check if the message contains an external link
      if (hasExternalLink(message.content)) {
        // Try to delete the message
        await message.delete().catch(e => {
          logger.error(`Failed to delete external link: ${e}`);
          return;
        });
        
        // Send warning
        const embed = new EmbedBuilder()
          .setTitle('External Link Detected')
          .setDescription('External links are not allowed in this server.')
          .setColor('#ff0000')
          .setAuthor({
            name: message.author.tag,
            iconURL: message.author.displayAvatarURL({ dynamic: true })
          })
          .setTimestamp();
        
        // Send warning message and delete it after 10 seconds
        message.channel.send({ 
          content: `<@${message.author.id}>`,
          embeds: [embed] 
        }).then(msg => {
          setTimeout(() => {
            msg.delete().catch(() => {});
          }, 10000);
        });
      }
    } catch (error) {
      logger.error(`Error in link filter: ${error}`);
    }
  }
};

// Function to check for external links
function hasExternalLink(content) {
  // Regex to match URLs (http, https, www)
  const linkRegex = /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/i;
  
  // Allow Discord links
  if (linkRegex.test(content)) {
    const discordRegex = /^(https?:\/\/)?(www\.)?(discord\.(gg|io|me|li)|discord(app)?\.com)\/.+$/i;
    const matches = content.match(linkRegex);
    
    // Check all matched URLs
    for (const match of matches) {
      // If it's not a Discord link, it's an external link
      if (!discordRegex.test(match)) {
        return true;
      }
    }
  }
  
  return false;
}