const { Events } = require('discord.js');
const ReactionRole = require('../../models/reactionrole/ReactionRole');
const logger = require('../../utils/logger');

module.exports = {
  name: Events.MessageReactionRemove,
  async execute(reaction, user) {
    // Don't process reactions from bots
    if (user.bot) return;
    
    // If the reaction is partial, fetch it
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        logger.error(`Error fetching reaction: ${error}`);
        return;
      }
    }
    
    // If the reaction's message is partial, fetch it
    if (reaction.message.partial) {
      try {
        await reaction.message.fetch();
      } catch (error) {
        logger.error(`Error fetching message: ${error}`);
        return;
      }
    }
    
    // Get info about the reaction
    const { message } = reaction;
    const emojiId = reaction.emoji.id ? `<:${reaction.emoji.name}:${reaction.emoji.id}>` : reaction.emoji.name;
    
    try {
      // Check if this message has reaction roles set up
      const reactionRoleConfig = await ReactionRole.findOne({
        messageID: message.id,
        channelID: message.channel.id,
        guildID: message.guild.id
      });
      
      // If no reaction role config exists or if it's a verification type, return
      if (!reactionRoleConfig || reactionRoleConfig.type === 'verification') return;
      
      // Find the reaction that matches the emoji
      const matchingReaction = reactionRoleConfig.reactions.find(r => r.emoji === emojiId);
      
      // If no matching reaction, return
      if (!matchingReaction) return;
      
      // Get the guild member
      const member = await message.guild.members.fetch(user.id);
      if (!member) return;
      
      // Get the role
      const role = await message.guild.roles.fetch(matchingReaction.roleID);
      if (!role) {
        logger.warn(`Role ${matchingReaction.roleID} not found for reaction role in guild ${message.guild.id}`);
        return;
      }
      
      // Remove the role if the user has it
      if (member.roles.cache.has(role.id)) {
        await member.roles.remove(role);
        
        // Try to notify the user via DM
        try {
          await user.send({
            content: `The **${role.name}** role has been removed from you in **${message.guild.name}**!`
          }).catch(() => {
            // Ignore errors sending DMs (user might have them disabled)
          });
        } catch (dmError) {
          // Ignore DM errors
        }
      }
    } catch (error) {
      logger.error(`Error processing reaction role removal: ${error}`);
    }
  }
};