const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle } = require('discord.js');
const logger = require('../../utils/logger');

module.exports = {
  name: 'bugreport',
  description: 'Report a bug to the bot developers',
  category: 'utility',
  cooldown: 300, // 5 minute cooldown to prevent spam
  usage: '',
  examples: ['bugreport'],
  
  data: new SlashCommandBuilder()
    .setName('bugreport')
    .setDescription('Report a bug to the bot developers'),
  
  async execute(interaction) {
    try {
      // Create a modal for collecting bug report information
      const modal = new ModalBuilder()
        .setCustomId('bug_report_modal')
        .setTitle('Bug Report');
      
      // Add input fields to the modal
      const bugNameInput = new TextInputBuilder()
        .setCustomId('bug_name')
        .setLabel('Bug Title')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('A brief title for this bug')
        .setMaxLength(100)
        .setRequired(true);
      
      const bugDescriptionInput = new TextInputBuilder()
        .setCustomId('bug_description')
        .setLabel('Bug Description')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Please describe the bug in detail. What happened?')
        .setMaxLength(1000)
        .setRequired(true);
      
      const commandInput = new TextInputBuilder()
        .setCustomId('command')
        .setLabel('Command / Feature')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Which command or feature is affected?')
        .setMaxLength(100)
        .setRequired(true);
      
      const expectedBehaviorInput = new TextInputBuilder()
        .setCustomId('expected_behavior')
        .setLabel('Expected Behavior')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('What did you expect to happen?')
        .setMaxLength(1000)
        .setRequired(true);
      
      // Add inputs to action rows
      const firstActionRow = new ActionRowBuilder().addComponents(bugNameInput);
      const secondActionRow = new ActionRowBuilder().addComponents(bugDescriptionInput);
      const thirdActionRow = new ActionRowBuilder().addComponents(commandInput);
      const fourthActionRow = new ActionRowBuilder().addComponents(expectedBehaviorInput);
      
      // Add action rows to the modal
      modal.addComponents(firstActionRow, secondActionRow, thirdActionRow, fourthActionRow);
      
      // Show the modal to the user
      await interaction.showModal(modal);
      
      logger.debug(`Bug report modal shown to ${interaction.user.tag} (${interaction.user.id})`);
      
      // Note: The modal submission is handled in the interactionCreate event
    } catch (error) {
      logger.error(`Error executing bugreport command: ${error}`);
      
      // Only reply if there's an error showing the modal
      await interaction.reply({
        content: 'There was an error opening the bug report form. Please try again later.',
        ephemeral: true
      });
    }
  }
};