const { EmbedBuilder } = require('discord.js');
const AFK = require('../../models/AFK');
const logger = require('../../utils/logger');

module.exports = {
  name: 'messageCreate',
  once: false,
  async execute(message, client) {
    try {
      // Ignore messages from bots
      if (message.author.bot) return;
      
      // Check if the message author is AFK
      const isAfk = await AFK.findOne({ 
        userID: message.author.id,
        serverID: message.guild.id
      });
      
      if (isAfk) {
        // Calculate time difference
        const timeAFK = Math.round((Date.now() - isAfk.time) / 1000);
        const timeString = formatTime(timeAFK);
        
        // Remove AFK status
        await AFK.deleteOne({ 
          userID: message.author.id,
          serverID: message.guild.id
        });
        
        // Restore original nickname
        if (message.member && message.member.manageable) {
          await message.member.setNickname(isAfk.oldNickname).catch(() => {
            logger.warn(`Failed to reset nickname for ${message.author.tag}`);
          });
        }
        
        // Send welcome back message
        const embed = new EmbedBuilder()
          .setDescription(`Welcome back! I've removed your AFK status. You were AFK for ${timeString}.`)
          .setColor('#00ff00')
          .setAuthor({ 
            name: message.author.tag, 
            iconURL: message.author.displayAvatarURL({ dynamic: true }) 
          });
        
        message.reply({ embeds: [embed] }).then(msg => {
          setTimeout(() => {
            msg.delete().catch(() => {});
          }, 10000); // Delete after 10 seconds
        });
      }
      
      // Check if the message mentions any AFK users
      if (message.mentions.users.size > 0) {
        for (const [id, user] of message.mentions.users) {
          const mentionedAFK = await AFK.findOne({ 
            userID: id,
            serverID: message.guild.id
          });
          
          if (mentionedAFK) {
            // Calculate time difference
            const timeAFK = Math.round((Date.now() - mentionedAFK.time) / 1000);
            const timeString = formatTime(timeAFK);
            
            // Send AFK notification
            const embed = new EmbedBuilder()
              .setDescription(`${user.tag} is currently AFK: ${mentionedAFK.reason}\nAFK for: ${timeString}`)
              .setColor('#ff9900')
              .setAuthor({ 
                name: user.tag, 
                iconURL: user.displayAvatarURL({ dynamic: true }) 
              })
              .setTimestamp(mentionedAFK.time);
            
            message.reply({ embeds: [embed] }).then(msg => {
              setTimeout(() => {
                msg.delete().catch(() => {});
              }, 10000); // Delete after 10 seconds
            });
          }
        }
      }
    } catch (error) {
      logger.error(`Error in AFK message handler: ${error}`);
    }
  }
};

// Format seconds into a readable time string
function formatTime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  const parts = [];
  
  if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
  if (secs > 0 && parts.length === 0) parts.push(`${secs} second${secs !== 1 ? 's' : ''}`);
  
  return parts.join(', ');
}