const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const TicketSettings = require('../../models/ticket/TicketSettings');
const logger = require('../../utils/logger');

module.exports = {
  name: 'ticketsetup',
  description: 'Configure the ticket system',
  category: 'ticket',
  aliases: ['setupticket', 'ticketconfig'],
  usage: '',
  examples: ['ticketsetup'],
  userPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles],
  
  data: new SlashCommandBuilder()
    .setName('ticketsetup')
    .setDescription('Configure the ticket system')
    .addChannelOption(option => 
      option.setName('category')
        .setDescription('The category where ticket channels will be created')
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(true))
    .addRoleOption(option => 
      option.setName('support_role')
        .setDescription('The role that can see and respond to tickets')
        .setRequired(true))
    .addChannelOption(option => 
      option.setName('transcript_channel')
        .setDescription('Channel where ticket transcripts will be sent')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true))
    .addChannelOption(option => 
      option.setName('ticket_channel')
        .setDescription('Channel where users can create tickets')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true))
    .addStringOption(option => 
      option.setName('welcome_message')
        .setDescription('Message to send when a ticket is created')
        .setRequired(false))
    .addStringOption(option => 
      option.setName('ticket_description')
        .setDescription('Description for the ticket creation message')
        .setRequired(false))
    .addStringOption(option => 
      option.setName('button_label')
        .setDescription('Label for the create ticket button')
        .setRequired(false))
    .addStringOption(option => 
      option.setName('button_emoji')
        .setDescription('Emoji for the create ticket button')
        .setRequired(false))
    .addStringOption(option => 
      option.setName('button_color')
        .setDescription('Color for the create ticket button')
        .setRequired(false)
        .addChoices(
          { name: 'Blue (Primary)', value: 'Primary' },
          { name: 'Grey (Secondary)', value: 'Secondary' },
          { name: 'Green (Success)', value: 'Success' },
          { name: 'Red (Danger)', value: 'Danger' }
        ))
    .addBooleanOption(option => 
      option.setName('use_threads')
        .setDescription('Use threads instead of channels for tickets')
        .setRequired(false))
    .addIntegerOption(option => 
      option.setName('ticket_limit')
        .setDescription('Maximum number of tickets a user can have open')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(10))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  // Slash command execution
  async execute(interaction) {
    try {
      // Defer reply as this might take a moment
      await interaction.deferReply();
      
      // Get options
      const category = interaction.options.getChannel('category');
      const supportRole = interaction.options.getRole('support_role');
      const transcriptChannel = interaction.options.getChannel('transcript_channel');
      const ticketChannel = interaction.options.getChannel('ticket_channel');
      const welcomeMessage = interaction.options.getString('welcome_message');
      const ticketDescription = interaction.options.getString('ticket_description');
      const buttonLabel = interaction.options.getString('button_label');
      const buttonEmoji = interaction.options.getString('button_emoji');
      const buttonColor = interaction.options.getString('button_color');
      const useThreads = interaction.options.getBoolean('use_threads');
      const ticketLimit = interaction.options.getInteger('ticket_limit');
      
      // Get or create ticket settings
      let ticketSettings = await TicketSettings.findOne({ guildID: interaction.guild.id });
      
      if (!ticketSettings) {
        ticketSettings = new TicketSettings({ guildID: interaction.guild.id });
      }
      
      // Update settings with new values
      ticketSettings.enabled = true;
      ticketSettings.supportRole = supportRole.id;
      ticketSettings.category = category.id;
      ticketSettings.transcriptChannel = transcriptChannel.id;
      ticketSettings.ticketChannel = ticketChannel.id;
      
      if (welcomeMessage) ticketSettings.ticketWelcomeMessage = welcomeMessage;
      if (ticketDescription) ticketSettings.ticketDescription = ticketDescription;
      if (buttonLabel) ticketSettings.buttonLabel = buttonLabel;
      if (buttonEmoji) ticketSettings.buttonEmoji = buttonEmoji;
      if (buttonColor) ticketSettings.buttonColor = buttonColor;
      if (useThreads !== null) ticketSettings.useThreads = useThreads;
      if (ticketLimit) ticketSettings.userTicketLimit = ticketLimit;
      
      // Save settings
      await ticketSettings.save();
      
      // Create ticket embed in the ticket channel
      const buttonStyle = ButtonStyle[buttonColor || 'Primary'];
      
      const ticketEmbed = new EmbedBuilder()
        .setTitle('Support Tickets')
        .setDescription(ticketSettings.ticketDescription)
        .setColor('#0099ff')
        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
        .setTimestamp();
      
      const buttonRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('create_ticket')
            .setLabel(ticketSettings.buttonLabel)
            .setEmoji(ticketSettings.buttonEmoji)
            .setStyle(buttonStyle)
        );
      
      // Send the ticket message
      const ticketMessage = await ticketChannel.send({
        embeds: [ticketEmbed],
        components: [buttonRow]
      });
      
      // Save message ID
      ticketSettings.ticketMessage = ticketMessage.id;
      await ticketSettings.save();
      
      // Reply with success message
      const successEmbed = new EmbedBuilder()
        .setTitle('Ticket System Configured')
        .setDescription('The ticket system has been successfully set up!')
        .addFields(
          { name: 'Support Role', value: `<@&${supportRole.id}>`, inline: true },
          { name: 'Category', value: category.name, inline: true },
          { name: 'Transcript Channel', value: `<#${transcriptChannel.id}>`, inline: true },
          { name: 'Ticket Channel', value: `<#${ticketChannel.id}>`, inline: true },
          { name: 'Using Threads', value: useThreads ? 'Yes' : 'No', inline: true },
          { name: 'Ticket Limit', value: `${ticketSettings.userTicketLimit} per user`, inline: true }
        )
        .setColor('#00FF00')
        .setTimestamp();
      
      await interaction.editReply({ embeds: [successEmbed] });
      
    } catch (error) {
      logger.error(`Error in ticketsetup command: ${error}`);
      
      if (interaction.deferred) {
        await interaction.editReply({ 
          content: 'There was an error setting up the ticket system. Please check my permissions and try again.'
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
      // Send instructions for using slash command instead
      const embed = new EmbedBuilder()
        .setTitle('Ticket Setup')
        .setDescription('Please use the slash command `/ticketsetup` to configure the ticket system, as it provides a more user-friendly interface with all the necessary options.')
        .setColor('#FF9900')
        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      
      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error in legacy ticketsetup command: ${error}`);
      message.reply('There was an error executing this command!');
    }
  }
};