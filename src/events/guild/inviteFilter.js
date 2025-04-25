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
      
      // If no settings or anti-invites is disabled, ignore
      if (!guildSettings || !guildSettings.antiInvites) return;
      
      // Check if the message contains an invite link
      if (hasInviteLink(message.content)) {
        // Try to delete the message
        await message.delete().catch(e => {
          logger.error(`Failed to delete invite link: ${e}`);
          return;
        });
        
        // Send warning
        const embed = new EmbedBuilder()
          .setTitle('Invite Link Detected')
          .setDescription('Discord invite links are not allowed in this server.')
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
      logger.error(`Error in invite filter: ${error}`);
    }
  }
};

// Function to check for Discord invite links
function hasInviteLink(content) {
  // Regex to match discord.gg, discordapp.com/invite, discord.com/invite
  const inviteRegex = /(discord\.(gg|io|me|li)|discord(app)?\.com\/invite)\/[a-zA-Z0-9\-]{2,}/i;
  return inviteRegex.test(content);
}