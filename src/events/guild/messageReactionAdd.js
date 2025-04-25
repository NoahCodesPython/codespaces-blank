const { Events } = require('discord.js');
const ReactionRole = require('../../models/reactionrole/ReactionRole');
const logger = require('../../utils/logger');

module.exports = {
  name: Events.MessageReactionAdd,
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
      
      // If no reaction role config exists, return
      if (!reactionRoleConfig) return;
      
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
      
      // Handle different reaction role types
      if (reactionRoleConfig.type === 'unique') {
        // Remove all other roles from this reaction role message
        for (const r of reactionRoleConfig.reactions) {
          if (r.emoji !== emojiId) {
            const otherRole = await message.guild.roles.fetch(r.roleID).catch(() => null);
            if (otherRole && member.roles.cache.has(otherRole.id)) {
              await member.roles.remove(otherRole);
              
              // Remove user's reaction to the other emoji
              const otherReaction = message.reactions.cache.find(
                react => react.emoji.id ? `<:${react.emoji.name}:${react.emoji.id}>` === r.emoji : react.emoji.name === r.emoji
              );
              
              if (otherReaction) {
                await otherReaction.users.remove(user.id).catch(error => {
                  logger.error(`Failed to remove user reaction: ${error}`);
                });
              }
            }
          }
        }
      }
      
      // Add the role if the user doesn't already have it
      if (!member.roles.cache.has(role.id)) {
        await member.roles.add(role);
        
        // For verification type, remove the reaction after role is assigned
        if (reactionRoleConfig.type === 'verification') {
          await reaction.users.remove(user.id).catch(error => {
            logger.error(`Failed to remove user reaction in verification role: ${error}`);
          });
        }
        
        // Try to notify the user via DM
        try {
          await user.send({
            content: `You have been given the **${role.name}** role in **${message.guild.name}**!`
          }).catch(() => {
            // Ignore errors sending DMs (user might have them disabled)
          });
        } catch (dmError) {
          // Ignore DM errors
        }
      }
    } catch (error) {
      logger.error(`Error processing reaction role: ${error}`);
    }
  }
};