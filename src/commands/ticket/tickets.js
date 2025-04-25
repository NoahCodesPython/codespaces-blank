const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Ticket = require('../../models/ticket/Ticket');
const TicketSettings = require('../../models/ticket/TicketSettings');
const logger = require('../../utils/logger');

module.exports = {
  name: 'tickets',
  description: 'View all active tickets in the server',
  category: 'ticket',
  aliases: ['viewtickets', 'listtickets'],
  usage: '',
  examples: ['tickets'],
  userPermissions: [PermissionFlagsBits.ManageChannels],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('tickets')
    .setDescription('View all active tickets in the server')
    .addStringOption(option => 
      option.setName('status')
        .setDescription('Filter tickets by status')
        .setRequired(false)
        .addChoices(
          { name: 'Open', value: 'open' },
          { name: 'Closed', value: 'closed' },
          { name: 'All', value: 'all' }
        ))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  
  // Slash command execution
  async execute(interaction) {
    try {
      // Defer reply
      await interaction.deferReply();
      
      const guildID = interaction.guild.id;
      const status = interaction.options.getString('status') || 'open';
      
      // Check if ticket system is set up
      const settings = await TicketSettings.findOne({ guildID });
      
      if (!settings || !settings.enabled) {
        return interaction.editReply('The ticket system is not set up for this server.');
      }
      
      // Build filter based on status
      const filter = { guildID };
      if (status !== 'all') {
        filter.status = status;
      }
      
      // Get tickets
      const tickets = await Ticket.find(filter).sort({ ticketNumber: -1 });
      
      if (tickets.length === 0) {
        return interaction.editReply(`There are no ${status === 'all' ? '' : status} tickets in this server.`);
      }
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle(`${status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)} Tickets`)
        .setColor('#0099ff')
        .setFooter({ text: `Total: ${tickets.length} tickets`, iconURL: interaction.guild.iconURL({ dynamic: true }) })
        .setTimestamp();
      
      // Add ticket information
      let description = '';
      
      for (const ticket of tickets.slice(0, 25)) { // Limit to 25 tickets to avoid description length issues
        const creator = await interaction.client.users.fetch(ticket.creatorID).catch(() => ({ tag: 'Unknown User' }));
        const channelMention = ticket.status === 'open' ? `<#${ticket.channelID}>` : `#ticket-${ticket.ticketNumber}`;
        
        description += `**#${ticket.ticketNumber}** | ${channelMention}\n`;
        description += `**Creator:** ${creator.tag}\n`;
        description += `**Status:** ${ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}\n`;
        description += `**Created:** <t:${Math.floor(ticket.createdAt.getTime() / 1000)}:R>\n`;
        
        if (ticket.status === 'closed') {
          description += `**Closed:** <t:${Math.floor(ticket.closedAt.getTime() / 1000)}:R>\n`;
        }
        
        description += '\n';
      }
      
      if (tickets.length > 25) {
        description += `\n*Showing 25/${tickets.length} tickets. Use more specific filters to see more.*`;
      }
      
      embed.setDescription(description);
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error in tickets command: ${error}`);
      
      if (interaction.deferred) {
        await interaction.editReply({ 
          content: 'There was an error retrieving the tickets.'
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
      // Check permissions
      if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return message.reply('You need Manage Channels permission to use this command.');
      }
      
      const guildID = message.guild.id;
      const status = args[0]?.toLowerCase() || 'open';
      
      // Validate status
      if (!['open', 'closed', 'all'].includes(status)) {
        return message.reply('Invalid status. Use `open`, `closed`, or `all`.');
      }
      
      // Check if ticket system is set up
      const settings = await TicketSettings.findOne({ guildID });
      
      if (!settings || !settings.enabled) {
        return message.reply('The ticket system is not set up for this server.');
      }
      
      // Build filter based on status
      const filter = { guildID };
      if (status !== 'all') {
        filter.status = status;
      }
      
      // Get tickets
      const tickets = await Ticket.find(filter).sort({ ticketNumber: -1 });
      
      if (tickets.length === 0) {
        return message.reply(`There are no ${status === 'all' ? '' : status} tickets in this server.`);
      }
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle(`${status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)} Tickets`)
        .setColor('#0099ff')
        .setFooter({ text: `Total: ${tickets.length} tickets`, iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTimestamp();
      
      // Add ticket information
      let description = '';
      
      for (const ticket of tickets.slice(0, 25)) { // Limit to 25 tickets to avoid description length issues
        const creator = await client.users.fetch(ticket.creatorID).catch(() => ({ tag: 'Unknown User' }));
        const channelMention = ticket.status === 'open' ? `<#${ticket.channelID}>` : `#ticket-${ticket.ticketNumber}`;
        
        description += `**#${ticket.ticketNumber}** | ${channelMention}\n`;
        description += `**Creator:** ${creator.tag}\n`;
        description += `**Status:** ${ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}\n`;
        description += `**Created:** <t:${Math.floor(ticket.createdAt.getTime() / 1000)}:R>\n`;
        
        if (ticket.status === 'closed') {
          description += `**Closed:** <t:${Math.floor(ticket.closedAt.getTime() / 1000)}:R>\n`;
        }
        
        description += '\n';
      }
      
      if (tickets.length > 25) {
        description += `\n*Showing 25/${tickets.length} tickets. Use more specific filters to see more.*`;
      }
      
      embed.setDescription(description);
      
      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error in legacy tickets command: ${error}`);
      message.reply('There was an error retrieving the tickets.');
    }
  }
};