const { EmbedBuilder } = require('discord.js');
const Suggestion = require('../../models/Suggestion');
const SuggestionSettings = require('../../models/SuggestionSettings');
const logger = require('../../utils/logger');

module.exports = {
  name: 'interactionCreate',
  once: false,
  async execute(interaction, client) {
    // DISABLED - Moved to centralized handler
    return;
    
    try {
      // Only handle button interactions that are for suggestions
      if (!(interaction.componentType === 2 && interaction.customId?.startsWith('suggestion_'))) return;
      
      // Extract info from custom ID
      const [_, action, suggestionID] = interaction.customId.split('_');
      
      if (!action || !suggestionID || !['upvote', 'downvote'].includes(action)) return;
      
      // Defer reply to prevent interaction timeout
      await interaction.deferReply({ ephemeral: true });
      
      // Get suggestion settings
      const settings = await SuggestionSettings.findOne({ guildID: interaction.guild.id });
      
      if (!settings || !settings.enabled) {
        return interaction.editReply('The suggestion system is not enabled on this server.');
      }
      
      // Find the suggestion
      const suggestion = await Suggestion.findOne({ 
        guildID: interaction.guild.id,
        suggestionID: parseInt(suggestionID)
      });
      
      if (!suggestion) {
        return interaction.editReply(`Suggestion #${suggestionID} could not be found.`);
      }
      
      // Check if suggestion is pending
      if (suggestion.status !== 'pending') {
        return interaction.editReply(`This suggestion has already been marked as ${suggestion.status}.`);
      }
      
      // Check if voting on own suggestion
      if (!settings.allowSelfVote && suggestion.userID === interaction.user.id) {
        return interaction.editReply('You cannot vote on your own suggestion!');
      }
      
      // Find if user has already voted
      const existingVote = suggestion.voters.find(v => v.userID === interaction.user.id);
      
      // Handle votes based on settings and existing votes
      if (existingVote) {
        // Check if changing votes is allowed
        if (!settings.allowChangeVote) {
          return interaction.editReply('You cannot change your vote on this suggestion!');
        }
        
        // Is user trying to vote the same way?
        if (existingVote.vote === action.replace('vote', '')) {
          return interaction.editReply('You have already voted that way on this suggestion!');
        }
        
        // Remove old vote
        if (existingVote.vote === 'up') {
          suggestion.upvotes--;
        } else {
          suggestion.downvotes--;
        }
        
        // Update vote
        existingVote.vote = action.replace('vote', '');
        
        // Add new vote
        if (action === 'upvote') {
          suggestion.upvotes++;
        } else {
          suggestion.downvotes++;
        }
      } else {
        // Add new vote
        suggestion.voters.push({
          userID: interaction.user.id,
          vote: action.replace('vote', '')
        });
        
        if (action === 'upvote') {
          suggestion.upvotes++;
        } else {
          suggestion.downvotes++;
        }
      }
      
      // Save the updated suggestion
      await suggestion.save();
      
      // Update message
      try {
        const channel = await interaction.guild.channels.fetch(suggestion.channelID);
        const message = await channel.messages.fetch(suggestion.messageID);
        
        const embed = EmbedBuilder.from(message.embeds[0]);
        
        // Update votes field
        const fields = embed.data.fields;
        for (let i = 0; i < fields.length; i++) {
          if (fields[i].name === 'Votes') {
            fields[i].value = `👍 ${suggestion.upvotes} | 👎 ${suggestion.downvotes}`;
          }
        }
        
        await message.edit({ embeds: [embed] });
        
        // Respond to user
        await interaction.editReply(`Your vote has been recorded! (${action === 'upvote' ? '👍' : '👎'})`);
        
      } catch (error) {
        logger.error(`Error updating suggestion message: ${error}`);
        await interaction.editReply('Your vote has been recorded, but the suggestion message could not be updated.');
      }
      
    } catch (error) {
      logger.error(`Error in suggestion vote handler: ${error}`);
      
      // If interaction wasn't already replied to, reply with error
      if (interaction.deferred) {
        await interaction.editReply('There was an error processing your vote.').catch(() => {});
      } else if (!interaction.replied) {
        await interaction.reply({ content: 'There was an error processing your vote.', ephemeral: true }).catch(() => {});
      }
    }
  }
};