const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Suggestion = require('../../models/Suggestion');
const SuggestionSettings = require('../../models/SuggestionSettings');
const logger = require('../../utils/logger');

module.exports = {
  name: 'suggest',
  description: 'Create a suggestion for the server',
  category: 'utility',
  aliases: ['suggestion', 'idea'],
  usage: '<suggestion>',
  examples: ['suggest Add a music channel'],
  userPermissions: [],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('Create a suggestion for the server')
    .addStringOption(option => 
      option.setName('suggestion')
        .setDescription('Your suggestion')
        .setRequired(true)),
  
  // Slash command execution
  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });
      
      const suggestText = interaction.options.getString('suggestion');
      const guildID = interaction.guild.id;
      
      // Check if suggestions are enabled for this server
      const settings = await SuggestionSettings.findOne({ guildID });
      
      if (!settings || !settings.enabled || !settings.suggestionChannel) {
        return interaction.editReply('Suggestions are not enabled for this server or no suggestion channel has been set.');
      }
      
      // Get the suggestion channel
      const suggestionChannel = await interaction.guild.channels.fetch(settings.suggestionChannel).catch(() => null);
      
      if (!suggestionChannel) {
        return interaction.editReply('The suggestion channel could not be found. Please contact a server administrator.');
      }
      
      // Increment suggestion count
      settings.suggestionCount++;
      await settings.save();
      
      const suggestionID = settings.suggestionCount;
      
      // Create suggestion embed
      const embed = new EmbedBuilder()
        .setTitle(`Suggestion #${suggestionID}`)
        .setDescription(suggestText)
        .setColor(settings.colors.pending)
        .addFields(
          { name: 'Status', value: 'Pending', inline: true },
          { name: 'Votes', value: '👍 0 | 👎 0', inline: true }
        )
        .setFooter({ 
          text: settings.anonymous ? 
            `Suggestion #${suggestionID}` : 
            `Suggested by ${interaction.user.tag}`,
          iconURL: settings.anonymous ? 
            interaction.guild.iconURL({ dynamic: true }) : 
            interaction.user.displayAvatarURL({ dynamic: true }) 
        })
        .setTimestamp();
      
      // Create voting buttons
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`suggestion_upvote_${suggestionID}`)
            .setEmoji('👍')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`suggestion_downvote_${suggestionID}`)
            .setEmoji('👎')
            .setStyle(ButtonStyle.Secondary)
        );
      
      // Send suggestion to the suggestion channel
      const suggestionMessage = await suggestionChannel.send({
        embeds: [embed],
        components: [row]
      });
      
      // Save suggestion to database
      const newSuggestion = new Suggestion({
        guildID,
        channelID: suggestionChannel.id,
        messageID: suggestionMessage.id,
        suggestionID,
        suggestion: suggestText,
        userID: interaction.user.id
      });
      
      await newSuggestion.save();
      
      // Reply to user
      return interaction.editReply(`Your suggestion has been submitted! You can view it in ${suggestionChannel}.`);
      
    } catch (error) {
      logger.error(`Error in suggest command: ${error}`);
      
      if (interaction.deferred) {
        await interaction.editReply({ 
          content: 'There was an error submitting your suggestion.'
        });
      } else {
        await interaction.reply({ 
          content: 'There was an error executing this command!', 
          ephemeral: true 
        });
      }
    }
  },
  
  // Legacy command execution
  async run(client, message, args) {
    try {
      const suggestText = args.join(' ');
      
      if (!suggestText) {
        return message.reply('Please provide a suggestion!');
      }
      
      const guildID = message.guild.id;
      
      // Check if suggestions are enabled for this server
      const settings = await SuggestionSettings.findOne({ guildID });
      
      if (!settings || !settings.enabled || !settings.suggestionChannel) {
        return message.reply('Suggestions are not enabled for this server or no suggestion channel has been set.');
      }
      
      // Get the suggestion channel
      const suggestionChannel = await message.guild.channels.fetch(settings.suggestionChannel).catch(() => null);
      
      if (!suggestionChannel) {
        return message.reply('The suggestion channel could not be found. Please contact a server administrator.');
      }
      
      // Increment suggestion count
      settings.suggestionCount++;
      await settings.save();
      
      const suggestionID = settings.suggestionCount;
      
      // Create suggestion embed
      const embed = new EmbedBuilder()
        .setTitle(`Suggestion #${suggestionID}`)
        .setDescription(suggestText)
        .setColor(settings.colors.pending)
        .addFields(
          { name: 'Status', value: 'Pending', inline: true },
          { name: 'Votes', value: '👍 0 | 👎 0', inline: true }
        )
        .setFooter({ 
          text: settings.anonymous ? 
            `Suggestion #${suggestionID}` : 
            `Suggested by ${message.author.tag}`,
          iconURL: settings.anonymous ? 
            message.guild.iconURL({ dynamic: true }) : 
            message.author.displayAvatarURL({ dynamic: true }) 
        })
        .setTimestamp();
      
      // Create voting buttons
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`suggestion_upvote_${suggestionID}`)
            .setEmoji('👍')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`suggestion_downvote_${suggestionID}`)
            .setEmoji('👎')
            .setStyle(ButtonStyle.Secondary)
        );
      
      // Send suggestion to the suggestion channel
      const suggestionMessage = await suggestionChannel.send({
        embeds: [embed],
        components: [row]
      });
      
      // Save suggestion to database
      const newSuggestion = new Suggestion({
        guildID,
        channelID: suggestionChannel.id,
        messageID: suggestionMessage.id,
        suggestionID,
        suggestion: suggestText,
        userID: message.author.id
      });
      
      await newSuggestion.save();
      
      // Reply to user
      return message.reply(`Your suggestion has been submitted! You can view it in ${suggestionChannel}.`);
      
    } catch (error) {
      logger.error(`Error in legacy suggest command: ${error}`);
      message.reply('There was an error submitting your suggestion.');
    }
  }
};