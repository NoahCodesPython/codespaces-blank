const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const logger = require('../../utils/logger');

module.exports = {
  name: 'embed',
  description: 'Create a custom embed message',
  category: 'utility',
  aliases: ['createembed', 'makeembed'],
  usage: '',
  examples: ['embed'],
  userPermissions: [PermissionFlagsBits.ManageMessages],
  botPermissions: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks],
  
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Create a custom embed message')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  
  // Slash command execution
  async execute(interaction) {
    try {
      // Create a modal for the embed details
      const modal = new ModalBuilder()
        .setCustomId('embed_modal')
        .setTitle('Create an Embed Message');
      
      // Create text inputs
      const titleInput = new TextInputBuilder()
        .setCustomId('embed_title')
        .setLabel('Embed Title')
        .setPlaceholder('Enter a title for your embed')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(256);
      
      const descriptionInput = new TextInputBuilder()
        .setCustomId('embed_description')
        .setLabel('Embed Description')
        .setPlaceholder('Enter a description for your embed')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(4000);
      
      const colorInput = new TextInputBuilder()
        .setCustomId('embed_color')
        .setLabel('Embed Color (Hex code)')
        .setPlaceholder('#0099ff')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(7);
      
      const imageInput = new TextInputBuilder()
        .setCustomId('embed_image')
        .setLabel('Image URL (optional)')
        .setPlaceholder('https://example.com/image.png')
        .setStyle(TextInputStyle.Short)
        .setRequired(false);
      
      const footerInput = new TextInputBuilder()
        .setCustomId('embed_footer')
        .setLabel('Footer Text (optional)')
        .setPlaceholder('Footer text')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(2048);
      
      // Add inputs to the modal
      const titleRow = new ActionRowBuilder().addComponents(titleInput);
      const descriptionRow = new ActionRowBuilder().addComponents(descriptionInput);
      const colorRow = new ActionRowBuilder().addComponents(colorInput);
      const imageRow = new ActionRowBuilder().addComponents(imageInput);
      const footerRow = new ActionRowBuilder().addComponents(footerInput);
      
      modal.addComponents(titleRow, descriptionRow, colorRow, imageRow, footerRow);
      
      // Show the modal to the user
      await interaction.showModal(modal);
      
    } catch (error) {
      logger.error(`Error in embed command: ${error}`);
      interaction.reply({ 
        content: 'There was an error executing this command!', 
        ephemeral: true 
      });
    }
  },
  
  // Legacy command execution
  async run(client, message, args) {
    try {
      // Check permissions
      if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        return message.reply('You need the Manage Messages permission to use this command.');
      }
      
      // Create buttons for the user to interact with
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('create_embed_button')
            .setLabel('Create Embed')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('cancel_embed_button')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary)
        );
      
      // Send initial message with buttons
      const response = await message.reply({
        content: 'Click the button below to create a custom embed message.',
        components: [row]
      });
      
      // Create a collector for button interactions
      const filter = i => i.user.id === message.author.id;
      const collector = response.createMessageComponentCollector({ filter, time: 60000 });
      
      collector.on('collect', async i => {
        if (i.customId === 'create_embed_button') {
          // Create a modal for the embed details
          const modal = new ModalBuilder()
            .setCustomId('embed_modal_legacy')
            .setTitle('Create an Embed Message');
          
          // Create text inputs
          const titleInput = new TextInputBuilder()
            .setCustomId('embed_title')
            .setLabel('Embed Title')
            .setPlaceholder('Enter a title for your embed')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(256);
          
          const descriptionInput = new TextInputBuilder()
            .setCustomId('embed_description')
            .setLabel('Embed Description')
            .setPlaceholder('Enter a description for your embed')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(4000);
          
          const colorInput = new TextInputBuilder()
            .setCustomId('embed_color')
            .setLabel('Embed Color (Hex code)')
            .setPlaceholder('#0099ff')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(7);
          
          const imageInput = new TextInputBuilder()
            .setCustomId('embed_image')
            .setLabel('Image URL (optional)')
            .setPlaceholder('https://example.com/image.png')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);
          
          const footerInput = new TextInputBuilder()
            .setCustomId('embed_footer')
            .setLabel('Footer Text (optional)')
            .setPlaceholder('Footer text')
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(2048);
          
          // Add inputs to the modal
          const titleRow = new ActionRowBuilder().addComponents(titleInput);
          const descriptionRow = new ActionRowBuilder().addComponents(descriptionInput);
          const colorRow = new ActionRowBuilder().addComponents(colorInput);
          const imageRow = new ActionRowBuilder().addComponents(imageInput);
          const footerRow = new ActionRowBuilder().addComponents(footerInput);
          
          modal.addComponents(titleRow, descriptionRow, colorRow, imageRow, footerRow);
          
          // Show the modal to the user
          await i.showModal(modal);
        } else if (i.customId === 'cancel_embed_button') {
          // Cancel the embed creation
          await response.edit({
            content: 'Embed creation cancelled.',
            components: []
          });
          collector.stop();
        }
      });
      
      collector.on('end', collected => {
        if (collected.size === 0) {
          response.edit({
            content: 'Embed creation timed out.',
            components: []
          });
        }
      });
      
    } catch (error) {
      logger.error(`Error in legacy embed command: ${error}`);
      message.reply('There was an error executing this command!');
    }
  }
};