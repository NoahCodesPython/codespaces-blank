const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Suggestion = require('../../models/Suggestion');
const SuggestionSettings = require('../../models/SuggestionSettings');
const logger = require('../../utils/logger');

module.exports = {
  name: 'suggest',
  description: 'Submit a suggestion for the server',
  category: 'config',
  aliases: ['suggestion'],
  usage: '<suggestion>',
  examples: ['suggest Add a music channel', 'suggest We should organize weekly gaming events'],
  cooldown: 120, // 2 minute cooldown to prevent spam
  userPermissions: [],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('Submit a suggestion for the server')
    .addStringOption(option =>
      option.setName('suggestion')
        .setDescription('Your suggestion text')
        .setRequired(true)),
  
  // Slash command execution
  async execute(interaction) {
    try {
      const suggestion = interaction.options.getString('suggestion');
      
      // Get server suggestion settings
      const settings = await SuggestionSettings.findOne({ guildID: interaction.guild.id });
      
      // Check if suggestions are enabled for this server
      if (!settings || !settings.enabled) {
        return interaction.reply({
          content: 'Suggestions are not enabled on this server. Ask an admin to set them up!',
          ephemeral: true
        });
      }
      
      // Check if suggestion channel exists
      if (!settings.suggestionChannel) {
        return interaction.reply({
          content: 'The suggestion channel has not been set up. Ask an admin to set it up!',
          ephemeral: true
        });
      }
      
      // Get the suggestion channel
      const channel = await interaction.guild.channels.fetch(settings.suggestionChannel).catch(() => null);
      
      if (!channel) {
        return interaction.reply({
          content: 'The suggestion channel could not be found. Ask an admin to set it up correctly!',
          ephemeral: true
        });
      }
      
      // Check if the suggestion is too long or too short
      if (suggestion.length > 1900) {
        return interaction.reply({
          content: 'Your suggestion is too long! Please keep it under 1900 characters.',
          ephemeral: true
        });
      }
      
      if (suggestion.length < 10) {
        return interaction.reply({
          content: 'Your suggestion is too short! Please provide more details.',
          ephemeral: true
        });
      }
      
      // Increment suggestion count
      settings.suggestionCount += 1;
      await settings.save();
      
      const suggestionID = settings.suggestionCount;
      
      // Create suggestion embed
      const embed = new EmbedBuilder()
        .setTitle(`Suggestion #${suggestionID}`)
        .setDescription(suggestion)
        .setColor(settings.colors.pending)
        .addFields(
          { name: 'Status', value: '📊 Pending', inline: true },
          { name: 'Submitted by', value: settings.anonymous ? 'Anonymous' : `<@${interaction.user.id}>`, inline: true },
          { name: 'Votes', value: '👍 0 | 👎 0', inline: true }
        )
        .setFooter({ text: `ID: ${suggestionID}` })
        .setTimestamp();
      
      // Create voting buttons
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`suggestion_upvote_${suggestionID}`)
            .setEmoji('👍')
            .setLabel('Upvote')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`suggestion_downvote_${suggestionID}`)
            .setEmoji('👎')
            .setLabel('Downvote')
            .setStyle(ButtonStyle.Danger)
        );
      
      // Send the suggestion to the channel
      const suggestionMessage = await channel.send({ embeds: [embed], components: [row] });
      
      // Save the suggestion to the database
      const newSuggestion = new Suggestion({
        guildID: interaction.guild.id,
        channelID: channel.id,
        messageID: suggestionMessage.id,
        suggestionID: suggestionID,
        suggestion: suggestion,
        userID: interaction.user.id,
        status: 'pending'
      });
      
      await newSuggestion.save();
      
      // Confirm to the user
      await interaction.reply({
        content: `Your suggestion has been submitted! You can view it in ${channel}.`,
        ephemeral: true
      });
      
    } catch (error) {
      logger.error(`Error in suggest command: ${error}`);
      await interaction.reply({
        content: 'There was an error submitting your suggestion!',
        ephemeral: true
      });
    }
  },
  
  // Legacy command execution
  async run(client, message, args) {
    try {
      // Check if there are arguments
      if (!args.length) {
        return message.reply('Please provide a suggestion! Usage: `!suggest <suggestion>`');
      }
      
      const suggestion = args.join(' ');
      
      // Get server suggestion settings
      const settings = await SuggestionSettings.findOne({ guildID: message.guild.id });
      
      // Check if suggestions are enabled for this server
      if (!settings || !settings.enabled) {
        return message.reply('Suggestions are not enabled on this server. Ask an admin to set them up!');
      }
      
      // Check if suggestion channel exists
      if (!settings.suggestionChannel) {
        return message.reply('The suggestion channel has not been set up. Ask an admin to set it up!');
      }
      
      // Get the suggestion channel
      const channel = await message.guild.channels.fetch(settings.suggestionChannel).catch(() => null);
      
      if (!channel) {
        return message.reply('The suggestion channel could not be found. Ask an admin to set it up correctly!');
      }
      
      // Check if the suggestion is too long or too short
      if (suggestion.length > 1900) {
        return message.reply('Your suggestion is too long! Please keep it under 1900 characters.');
      }
      
      if (suggestion.length < 10) {
        return message.reply('Your suggestion is too short! Please provide more details.');
      }
      
      // Increment suggestion count
      settings.suggestionCount += 1;
      await settings.save();
      
      const suggestionID = settings.suggestionCount;
      
      // Create suggestion embed
      const embed = new EmbedBuilder()
        .setTitle(`Suggestion #${suggestionID}`)
        .setDescription(suggestion)
        .setColor(settings.colors.pending)
        .addFields(
          { name: 'Status', value: '📊 Pending', inline: true },
          { name: 'Submitted by', value: settings.anonymous ? 'Anonymous' : `<@${message.author.id}>`, inline: true },
          { name: 'Votes', value: '👍 0 | 👎 0', inline: true }
        )
        .setFooter({ text: `ID: ${suggestionID}` })
        .setTimestamp();
      
      // Create voting buttons
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`suggestion_upvote_${suggestionID}`)
            .setEmoji('👍')
            .setLabel('Upvote')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`suggestion_downvote_${suggestionID}`)
            .setEmoji('👎')
            .setLabel('Downvote')
            .setStyle(ButtonStyle.Danger)
        );
      
      // Send the suggestion to the channel
      const suggestionMessage = await channel.send({ embeds: [embed], components: [row] });
      
      // Save the suggestion to the database
      const newSuggestion = new Suggestion({
        guildID: message.guild.id,
        channelID: channel.id,
        messageID: suggestionMessage.id,
        suggestionID: suggestionID,
        suggestion: suggestion,
        userID: message.author.id,
        status: 'pending'
      });
      
      await newSuggestion.save();
      
      // Confirm to the user
      await message.reply(`Your suggestion has been submitted! You can view it in ${channel}.`);
      
    } catch (error) {
      logger.error(`Error in legacy suggest command: ${error}`);
      message.reply('There was an error submitting your suggestion!');
    }
  }
};