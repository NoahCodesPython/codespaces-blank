const { EmbedBuilder, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const Ticket = require('../../../models/ticket/Ticket');
const TicketSettings = require('../../../models/ticket/TicketSettings');
const { generateTranscript } = require('../../../utils/transcriptManager');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../../utils/logger');

/**
 * Handle the "Create Ticket" button click
 * @param {ButtonInteraction} interaction 
 * @param {Client} client 
 */
async function handleTicketCreate(interaction, client) {
  try {
    // Get the guild
    const { guild, user } = interaction;
    if (!guild) return;

    // Defer the reply
    await interaction.deferReply({ ephemeral: true });

    // Get ticket settings from database
    const settings = await TicketSettings.findOne({ guildID: guild.id });
    
    if (!settings || !settings.enabled) {
      return interaction.editReply('The ticket system is not properly configured on this server.');
    }
    
    // Check if user has reached ticket limit
    const userTickets = await Ticket.find({
      guildID: guild.id,
      creatorID: user.id,
      status: 'open'
    });
    
    if (userTickets.length >= settings.userTicketLimit) {
      return interaction.editReply(`You already have ${userTickets.length} open ticket(s). Please close your existing tickets before creating a new one.`);
    }
    
    // Generate unique ticket ID
    const ticketID = uuidv4().substring(0, 8); // Use first 8 characters of UUID
    const ticketNumber = settings.ticketCount + 1;
    
    // Get the category channel
    const category = await guild.channels.fetch(settings.category).catch(() => null);
    
    if (!category) {
      return interaction.editReply('The ticket category could not be found. Please contact an administrator.');
    }
    
    // Get the support role
    const supportRole = await guild.roles.fetch(settings.supportRole).catch(() => null);
    
    if (!supportRole) {
      return interaction.editReply('The support role could not be found. Please contact an administrator.');
    }
    
    let ticketChannel;
    
    // Create permissions for the channel
    const channelPermissions = [
      {
        id: guild.id,
        deny: [PermissionFlagsBits.ViewChannel]
      },
      {
        id: client.user.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels]
      },
      {
        id: user.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
      },
      {
        id: supportRole.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
      }
    ];
    
    // Create thread or channel based on settings
    if (settings.useThreads) {
      // Determine which channel to create the thread in
      const threadParent = await guild.channels.fetch(settings.ticketChannel).catch(() => null);
      
      if (!threadParent) {
        return interaction.editReply('The ticket channel could not be found. Please contact an administrator.');
      }
      
      // Create the thread
      ticketChannel = await threadParent.threads.create({
        name: `ticket-${user.username}-${ticketNumber}`,
        autoArchiveDuration: 1440, // 1 day
        reason: `Ticket created by ${user.tag}`
      });
      
      // Add the user to the thread
      await ticketChannel.members.add(user.id);
      
      // Add any supporters to the thread
      if (settings.ticketSupporters && settings.ticketSupporters.length > 0) {
        for (const supporterID of settings.ticketSupporters) {
          await ticketChannel.members.add(supporterID).catch(() => {});
        }
      }
    } else {
      // Create a regular channel
      ticketChannel = await guild.channels.create({
        name: `ticket-${user.username}-${ticketNumber}`,
        type: ChannelType.GuildText,
        parent: category.id,
        permissionOverwrites: channelPermissions,
        reason: `Ticket created by ${user.tag}`
      });
    }
    
    // Create the welcome embed
    const welcomeEmbed = new EmbedBuilder()
      .setTitle(`Ticket #${ticketNumber}`)
      .setDescription(settings.ticketWelcomeMessage || "Welcome to your ticket! Please describe your issue and support staff will be with you shortly.")
      .addFields(
        { name: 'Created By', value: `<@${user.id}>`, inline: true },
        { name: 'Ticket ID', value: ticketID, inline: true }
      )
      .setColor('#0099ff')
      .setFooter({ text: `Ticket #${ticketNumber}`, iconURL: guild.iconURL({ dynamic: true }) })
      .setTimestamp();
    
    // Create close button
    const closeButton = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('close_ticket')
          .setLabel('Close Ticket')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🔒')
      );
    
    // Send welcome message in the ticket channel
    await ticketChannel.send({
      content: `<@${user.id}> | <@&${supportRole.id}>`,
      embeds: [welcomeEmbed],
      components: [closeButton]
    });
    
    // Create ticket in database
    const newTicket = new Ticket({
      guildID: guild.id,
      channelID: ticketChannel.id,
      ticketID: ticketID,
      creatorID: user.id,
      ticketNumber: ticketNumber,
      isThread: settings.useThreads,
      participants: [user.id]
    });
    
    await newTicket.save();
    
    // Update ticket count
    settings.ticketCount = ticketNumber;
    await settings.save();
    
    // Reply to the user
    await interaction.editReply({
      content: `Your ticket has been created: <#${ticketChannel.id}>`
    });
    
    // Log ticket creation if log channel is set
    if (settings.ticketLogs) {
      const logChannel = await guild.channels.fetch(settings.ticketLogs).catch(() => null);
      
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setTitle('Ticket Created')
          .setDescription(`A new ticket has been created by <@${user.id}>`)
          .addFields(
            { name: 'Ticket Number', value: `#${ticketNumber}`, inline: true },
            { name: 'Ticket ID', value: ticketID, inline: true },
            { name: 'Channel', value: `<#${ticketChannel.id}>`, inline: true }
          )
          .setColor('#00FF00')
          .setFooter({ text: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) })
          .setTimestamp();
        
        await logChannel.send({ embeds: [logEmbed] });
      }
    }
  } catch (error) {
    logger.error(`Error creating ticket: ${error}`);
    
    try {
      if (interaction.deferred) {
        await interaction.editReply('There was an error creating your ticket. Please try again later or contact an administrator.');
      } else {
        await interaction.reply({
          content: 'There was an error creating your ticket. Please try again later or contact an administrator.',
          ephemeral: true
        });
      }
    } catch (replyError) {
      logger.error(`Error replying to interaction: ${replyError}`);
    }
  }
}

/**
 * Handle the "Close Ticket" button click
 * @param {ButtonInteraction} interaction 
 * @param {Client} client 
 */
async function handleTicketClose(interaction, client) {
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
    const confirmMessage = await interaction.editReply({
      embeds: [embed],
      components: [row]
    });
    
    // Create collector for button interaction
    const filter = i => i.user.id === user.id && 
                       ['confirm_close_btn', 'cancel_close_btn'].includes(i.customId);
    
    const collector = channel.createMessageComponentCollector({
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
        
        if (transcriptResult && transcriptResult.success) {
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
                
                if (transcriptResult && transcriptResult.success) {
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

module.exports = { handleTicketCreate, handleTicketClose };