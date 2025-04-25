const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Ticket = require('../../models/ticket/Ticket');
const TicketSettings = require('../../models/ticket/TicketSettings');
const { generateTranscript } = require('../../utils/transcriptManager');
const logger = require('../../utils/logger');

module.exports = {
  name: 'close',
  description: 'Close the current ticket',
  category: 'ticket',
  aliases: ['closeticket', 'ticketclose'],
  usage: '[reason]',
  examples: ['close', 'close Issue resolved'],
  userPermissions: [],
  botPermissions: [PermissionFlagsBits.ManageChannels],
  
  data: new SlashCommandBuilder()
    .setName('close')
    .setDescription('Close the current ticket')
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('Reason for closing the ticket')
        .setRequired(false)),
  
  // Slash command execution
  async execute(interaction) {
    try {
      // Defer reply
      await interaction.deferReply();
      
      // Get the reason if provided
      const reason = interaction.options.getString('reason') || 'No reason provided';
      
      // Check if this is a ticket channel/thread
      const ticket = await Ticket.findOne({
        guildID: interaction.guild.id,
        channelID: interaction.channel.id,
        status: 'open'
      });
      
      if (!ticket) {
        return interaction.editReply('This command can only be used in an open ticket channel!');
      }
      
      // Get ticket settings
      const ticketSettings = await TicketSettings.findOne({ guildID: interaction.guild.id });
      
      if (!ticketSettings) {
        return interaction.editReply('The ticket system is not properly configured for this server.');
      }
      
      // Check permissions
      const member = interaction.member;
      const isSupportStaff = member.roles.cache.has(ticketSettings.supportRole);
      const isTicketCreator = ticket.creatorID === member.id;
      const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
      
      if (!isSupportStaff && !isTicketCreator && !isAdmin) {
        return interaction.editReply('You do not have permission to close this ticket!');
      }
      
      // Create confirmation embed
      const embed = new EmbedBuilder()
        .setTitle('Close Ticket')
        .setDescription(`Are you sure you want to close ticket #${ticket.ticketNumber}?\n\nReason: ${reason}`)
        .setColor('#FF9900')
        .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      
      // Create confirm/cancel buttons
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('confirm_close')
            .setLabel('Close Ticket')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId('cancel_close')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary)
        );
      
      // Send confirmation message
      const confirmMessage = await interaction.editReply({
        embeds: [embed],
        components: [row]
      });
      
      // Create collector for button interaction
      const filter = i => i.user.id === interaction.user.id && 
                         ['confirm_close', 'cancel_close'].includes(i.customId);
      
      const collector = confirmMessage.createMessageComponentCollector({
        filter,
        time: 30000 // 30 seconds
      });
      
      collector.on('collect', async i => {
        if (i.customId === 'confirm_close') {
          // Generate transcript
          const transcriptResult = await generateTranscript(
            interaction.channel,
            interaction.guild,
            ticket,
            interaction.user
          );
          
          // Update ticket status in database
          ticket.status = 'closed';
          ticket.closedAt = new Date();
          ticket.closedBy = interaction.user.id;
          await ticket.save();
          
          // Final embed before closing
          const closingEmbed = new EmbedBuilder()
            .setTitle('Ticket Closed')
            .setDescription(`This ticket has been closed by ${interaction.user.tag}.\n\nReason: ${reason}`)
            .setColor('#FF0000')
            .setTimestamp();
          
          if (transcriptResult.success) {
            closingEmbed.addFields({ 
              name: 'Transcript', 
              value: `[Click to view](${transcriptResult.url})` 
            });
          }
          
          await i.update({ 
            embeds: [closingEmbed],
            components: []
          });
          
          // Wait a moment before closing the channel
          setTimeout(async () => {
            try {
              if (ticket.isThread) {
                // For threads
                await interaction.channel.setLocked(true);
                await interaction.channel.setArchived(true);
              } else {
                // For regular channels
                await interaction.channel.delete();
              }
            } catch (error) {
              logger.error(`Error closing ticket channel: ${error}`);
            }
          }, 5000);
          
        } else if (i.customId === 'cancel_close') {
          // Cancel the ticket closing
          await i.update({ 
            content: 'Ticket close cancelled.', 
            embeds: [], 
            components: [] 
          });
        }
      });
      
      collector.on('end', async collected => {
        if (collected.size === 0) {
          // Timeout - no response
          await interaction.editReply({
            content: 'Ticket close timed out.',
            embeds: [],
            components: []
          }).catch(() => {});
        }
      });
      
    } catch (error) {
      logger.error(`Error in close command: ${error}`);
      
      if (interaction.deferred) {
        await interaction.editReply({ 
          content: 'There was an error closing the ticket.'
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
      // Get the reason if provided
      const reason = args.length > 0 ? args.join(' ') : 'No reason provided';
      
      // Check if this is a ticket channel/thread
      const ticket = await Ticket.findOne({
        guildID: message.guild.id,
        channelID: message.channel.id,
        status: 'open'
      });
      
      if (!ticket) {
        return message.reply('This command can only be used in an open ticket channel!');
      }
      
      // Get ticket settings
      const ticketSettings = await TicketSettings.findOne({ guildID: message.guild.id });
      
      if (!ticketSettings) {
        return message.reply('The ticket system is not properly configured for this server.');
      }
      
      // Check permissions
      const member = message.member;
      const isSupportStaff = member.roles.cache.has(ticketSettings.supportRole);
      const isTicketCreator = ticket.creatorID === member.id;
      const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
      
      if (!isSupportStaff && !isTicketCreator && !isAdmin) {
        return message.reply('You do not have permission to close this ticket!');
      }
      
      // Create confirmation embed
      const embed = new EmbedBuilder()
        .setTitle('Close Ticket')
        .setDescription(`Are you sure you want to close ticket #${ticket.ticketNumber}?\n\nReason: ${reason}`)
        .setColor('#FF9900')
        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      
      // Create confirm/cancel buttons
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('confirm_close')
            .setLabel('Close Ticket')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId('cancel_close')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary)
        );
      
      // Send confirmation message
      const confirmMessage = await message.reply({
        embeds: [embed],
        components: [row]
      });
      
      // Create collector for button interaction
      const filter = i => i.user.id === message.author.id && 
                         ['confirm_close', 'cancel_close'].includes(i.customId);
      
      const collector = confirmMessage.createMessageComponentCollector({
        filter,
        time: 30000 // 30 seconds
      });
      
      collector.on('collect', async i => {
        if (i.customId === 'confirm_close') {
          // Generate transcript
          const transcriptResult = await generateTranscript(
            message.channel,
            message.guild,
            ticket,
            message.author
          );
          
          // Update ticket status in database
          ticket.status = 'closed';
          ticket.closedAt = new Date();
          ticket.closedBy = message.author.id;
          await ticket.save();
          
          // Final embed before closing
          const closingEmbed = new EmbedBuilder()
            .setTitle('Ticket Closed')
            .setDescription(`This ticket has been closed by ${message.author.tag}.\n\nReason: ${reason}`)
            .setColor('#FF0000')
            .setTimestamp();
          
          if (transcriptResult.success) {
            closingEmbed.addFields({ 
              name: 'Transcript', 
              value: `[Click to view](${transcriptResult.url})` 
            });
          }
          
          await i.update({ 
            embeds: [closingEmbed],
            components: []
          });
          
          // Wait a moment before closing the channel
          setTimeout(async () => {
            try {
              if (ticket.isThread) {
                // For threads
                await message.channel.setLocked(true);
                await message.channel.setArchived(true);
              } else {
                // For regular channels
                await message.channel.delete();
              }
            } catch (error) {
              logger.error(`Error closing ticket channel: ${error}`);
            }
          }, 5000);
          
        } else if (i.customId === 'cancel_close') {
          // Cancel the ticket closing
          await i.update({ 
            content: 'Ticket close cancelled.', 
            embeds: [], 
            components: [] 
          });
        }
      });
      
      collector.on('end', async collected => {
        if (collected.size === 0) {
          // Timeout - no response
          await confirmMessage.edit({
            content: 'Ticket close timed out.',
            embeds: [],
            components: []
          }).catch(() => {});
        }
      });
      
    } catch (error) {
      logger.error(`Error in legacy close command: ${error}`);
      message.reply('There was an error closing the ticket.');
    }
  }
};