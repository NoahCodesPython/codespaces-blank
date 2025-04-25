const { Events, EmbedBuilder } = require('discord.js');
const AltDetector = require('../../models/AltDetector');
const logger = require('../../utils/logger');
const ms = require('ms');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member, client) {
    try {
      // Check if user is a bot, if so, ignore
      if (member.user.bot) return;
      
      // Get Alt Detector settings for this guild
      const altSettings = await AltDetector.findOne({ guildID: member.guild.id });
      
      // If Alt detector is enabled for this guild
      if (altSettings && altSettings.altToggle) {
        // Calculate account age
        const accountCreation = member.user.createdAt;
        const accountAge = Date.now() - accountCreation;
        
        // Check if account is younger than the minimum age
        const minAge = altSettings.time;
        
        if (accountAge < minAge) {
          // Account is younger than minimum age - handle as potential alt
          const embed = new EmbedBuilder()
            .setTitle('⚠️ Alt Account Detected')
            .setDescription(`**User:** ${member.user.tag} (${member.id})`)
            .addFields(
              { name: 'Account Created', value: `<t:${Math.floor(accountCreation.getTime() / 1000)}:F>` },
              { name: 'Account Age', value: `${ms(accountAge, { long: true })}` },
              { name: 'Minimum Required Age', value: `${ms(minAge, { long: true })}` }
            )
            .setColor('#FF0000')
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .setTimestamp();
          
          // Handle the alt account based on guild settings
          if (altSettings.action === 'kick') {
            // Check if bot has permission to kick
            if (member.kickable) {
              await member.kick(`[Alt Detection] Account younger than ${ms(minAge, { long: true })}`);
              embed.addFields({ name: 'Action Taken', value: '👢 User has been kicked' });
            } else {
              embed.addFields({ name: 'Action Attempted', value: '❌ Failed to kick user (Missing Permissions)' });
            }
          } else if (altSettings.action === 'ban') {
            // Check if bot has permission to ban
            if (member.bannable) {
              await member.ban({ 
                reason: `[Alt Detection] Account younger than ${ms(minAge, { long: true })}`,
                deleteMessageSeconds: 86400 // Delete messages from the last 24 hours
              });
              embed.addFields({ name: 'Action Taken', value: '🔨 User has been banned' });
            } else {
              embed.addFields({ name: 'Action Attempted', value: '❌ Failed to ban user (Missing Permissions)' });
            }
          } else {
            // Just notify, no action
            embed.addFields({ name: 'Action Taken', value: '👀 Alert Only (No action taken)' });
          }
          
          // Check if alt log channel is set, if so, send notification
          if (altSettings.logChannel) {
            const logChannel = member.guild.channels.cache.get(altSettings.logChannel);
            if (logChannel) {
              await logChannel.send({ embeds: [embed] });
            }
          }
          
          // If the account is whitelisted, allow it
          if (altSettings.whitelisted && altSettings.whitelisted.includes(member.id)) {
            logger.info(`Whitelisted alt account allowed: ${member.user.tag} (${member.id})`);
            return;
          }
          
        }
      }
      
      // Handle welcome message (if implemented)
      // This would go here
      
    } catch (error) {
      logger.error(`Error in guildMemberAdd event: ${error}`);
    }
  }
};