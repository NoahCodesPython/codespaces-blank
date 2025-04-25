const { EmbedBuilder } = require('discord.js');
const Suggestion = require('../../models/Suggestion');
const SuggestionSettings = require('../../models/SuggestionSettings');
const logger = require('../../utils/logger');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // Only run this for suggestion vote buttons
    if (!interaction.isButton() || 
        !interaction.customId.startsWith('suggestion_upvote_') && 
        !interaction.customId.startsWith('suggestion_downvote_')) return;
    
    try {
      // Defer reply as ephemeral to hide the interaction
      await interaction.deferReply({ ephemeral: true });
      
      const { guild, user, customId } = interaction;
      
      // Parse button information
      const isUpvote = customId.startsWith('suggestion_upvote_');
      const suggestionID = parseInt(customId.split('_')[2]);
      
      // Get suggestion and settings from database
      const suggestion = await Suggestion.findOne({
        guildID: guild.id,
        suggestionID
      });
      
      if (!suggestion) {
        return interaction.editReply('This suggestion could not be found or has been deleted.');
      }
      
      const settings = await SuggestionSettings.findOne({ guildID: guild.id });
      
      if (!settings) {
        return interaction.editReply('Suggestion settings could not be found for this server.');
      }
      
      // Check if user is the suggestion creator and self-voting is disabled
      if (suggestion.userID === user.id && !settings.allowSelfVote) {
        return interaction.editReply('You cannot vote on your own suggestion!');
      }
      
      // Check if user has already voted
      const existingVote = suggestion.voters.find(voter => voter.userID === user.id);
      
      if (existingVote) {
        // User has already voted
        if (!settings.allowChangeVote) {
          return interaction.editReply('You have already voted on this suggestion and cannot change your vote.');
        }
        
        // Change vote if it's different
        if ((isUpvote && existingVote.vote === 'up') || (!isUpvote && existingVote.vote === 'down')) {
          return interaction.editReply(`You have already ${isUpvote ? 'upvoted' : 'downvoted'} this suggestion.`);
        }
        
        // Remove old vote
        if (existingVote.vote === 'up') {
          suggestion.upvotes--;
        } else {
          suggestion.downvotes--;
        }
        
        // Update the vote
        existingVote.vote = isUpvote ? 'up' : 'down';
      } else {
        // New vote
        suggestion.voters.push({
          userID: user.id,
          vote: isUpvote ? 'up' : 'down'
        });
      }
      
      // Update vote count
      if (isUpvote) {
        suggestion.upvotes++;
      } else {
        suggestion.downvotes++;
      }
      
      // Save suggestion
      await suggestion.save();
      
      // Get suggestion message
      const channel = await guild.channels.fetch(suggestion.channelID).catch(() => null);
      
      if (!channel) {
        return interaction.editReply('The suggestion channel could not be found.');
      }
      
      const message = await channel.messages.fetch(suggestion.messageID).catch(() => null);
      
      if (!message) {
        return interaction.editReply('The suggestion message could not be found.');
      }
      
      // Update the embed with new vote count
      const embed = EmbedBuilder.from(message.embeds[0]);
      
      // Update the votes field
      const fieldsToKeep = embed.data.fields.filter(field => field.name !== 'Votes');
      embed.data.fields = [
        ...fieldsToKeep,
        { name: 'Votes', value: `👍 ${suggestion.upvotes} | 👎 ${suggestion.downvotes}`, inline: true }
      ];
      
      // Edit the message
      await message.edit({ embeds: [embed] });
      
      // Confirm vote to user
      return interaction.editReply(`You have successfully ${isUpvote ? 'upvoted' : 'downvoted'} suggestion #${suggestionID}.`);
      
    } catch (error) {
      logger.error(`Error in suggestion vote button handler: ${error}`);
      
      try {
        if (interaction.deferred) {
          await interaction.editReply('There was an error processing your vote.');
        } else {
          await interaction.reply({
            content: 'There was an error processing your vote.',
            ephemeral: true
          });
        }
      } catch (replyError) {
        logger.error(`Error replying to interaction: ${replyError}`);
      }
    }
  }
};