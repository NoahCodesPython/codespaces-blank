const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Ticket = require('../../models/ticket/Ticket');
const TicketSettings = require('../../models/ticket/TicketSettings');
const { generateTranscript } = require('../../utils/transcriptManager');
const logger = require('../../utils/logger');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // Only run this for the close_ticket button
    if (!interaction.isButton() || interaction.customId !== 'close_ticket') return;
    
    try {
      // Defer reply
      await interaction.deferReply({ ephemeral: true });
      
      const { guild, channel, user } = interaction;
      
      // Check if this is a ticket channel
      const ticket = await Ticket.findOne({
        guildID: guild.id,
        channelID: channel.id,
        status: 'open'
      });
      
      if (!ticket) {
        return interaction.editReply('This channel is not an active ticket.');
      }
      
      // Get ticket settings
      const settings = await TicketSettings.findOne({ guildID: guild.id });
      
      if (!settings) {
        return interaction.editReply('The ticket system is not properly configured on this server.');
      }
      
      // Check permissions (creator, support role, or admin)
      const member = await guild.members.fetch(user.id);
      const isSupportStaff = member.roles.cache.has(settings.supportRole);
      const isTicketCreator = ticket.creatorID === user.id;
      const isAdmin = member.permissions.has('Administrator');
      
      if (!isSupportStaff && !isTicketCreator && !isAdmin) {
        return interaction.editReply('You do not have permission to close this ticket.');
      }
      
      // Create confirmation embed
      const embed = new EmbedBuilder()
        .setTitle('Close Ticket')
        .setDescription(`Are you sure you want to close ticket #${ticket.ticketNumber}?`)
        .setColor('#FF9900')
        .setFooter({ text: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      
      // Create confirm/cancel buttons
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('confirm_close_btn')
            .setLabel('Close Ticket')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId('cancel_close_btn')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary)
        );
      
      // Send confirmation message
      await interaction.editReply({
        embeds: [embed],
        components: [row]
      });
      
      // Create collector for button interaction
      const filter = i => i.user.id === user.id && 
                         ['confirm_close_btn', 'cancel_close_btn'].includes(i.customId);
      
      const collector = interaction.channel.createMessageComponentCollector({
        filter,
        time: 30000 // 30 seconds
      });
      
      collector.on('collect', async i => {
        if (i.customId === 'confirm_close_btn') {
          // Generate transcript
          const transcriptResult = await generateTranscript(
            channel,
            guild,
            ticket,
            user
          );
          
          // Update ticket status in database
          ticket.status = 'closed';
          ticket.closedAt = new Date();
          ticket.closedBy = user.id;
          await ticket.save();
          
          // Final embed before closing
          const closingEmbed = new EmbedBuilder()
            .setTitle('Ticket Closed')
            .setDescription(`This ticket has been closed by ${user.tag}.`)
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
                await channel.setLocked(true);
                await channel.setArchived(true);
              } else {
                // For regular channels
                await channel.delete();
              }
              
              // Log ticket closing if log channel is set
              if (settings.ticketLogs) {
                const logChannel = await guild.channels.fetch(settings.ticketLogs).catch(() => null);
                
                if (logChannel) {
                  const logEmbed = new EmbedBuilder()
                    .setTitle('Ticket Closed')
                    .setDescription(`Ticket #${ticket.ticketNumber} has been closed`)
                    .addFields(
                      { name: 'Ticket ID', value: ticket.ticketID, inline: true },
                      { name: 'Created By', value: `<@${ticket.creatorID}>`, inline: true },
                      { name: 'Closed By', value: `<@${user.id}>`, inline: true }
                    )
                    .setColor('#FF0000')
                    .setFooter({ text: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                  
                  if (transcriptResult.success) {
                    logEmbed.addFields({ 
                      name: 'Transcript', 
                      value: `[Click to view](${transcriptResult.url})` 
                    });
                  }
                  
                  await logChannel.send({ embeds: [logEmbed] });
                }
              }
            } catch (error) {
              logger.error(`Error closing ticket channel: ${error}`);
            }
          }, 5000);
          
        } else if (i.customId === 'cancel_close_btn') {
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
      logger.error(`Error in close ticket button handler: ${error}`);
      
      try {
        if (interaction.deferred) {
          await interaction.editReply('There was an error closing the ticket.');
        } else {
          await interaction.reply({
            content: 'There was an error closing the ticket.',
            ephemeral: true
          });
        }
      } catch (replyError) {
        logger.error(`Error replying to interaction: ${replyError}`);
      }
    }
  }
};