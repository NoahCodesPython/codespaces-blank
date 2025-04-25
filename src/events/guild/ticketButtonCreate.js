const { EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const { v4: uuidv4 } = require('uuid');
const Ticket = require('../../models/ticket/Ticket');
const TicketSettings = require('../../models/ticket/TicketSettings');
const logger = require('../../utils/logger');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // DISABLED - Moved to centralized handler
    return;
    
    // Only run this for the create_ticket button
    if (!(interaction.componentType === 2 && interaction.customId === 'create_ticket')) return;
    
    try {
      // Defer reply to prevent timeout
      await interaction.deferReply({ ephemeral: true });
      
      const { guild, user } = interaction;
      
      // Get ticket settings
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
        .setDescription(settings.ticketWelcomeMessage)
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
        content: `Your ticket has been created: ${settings.useThreads ? `<#${ticketChannel.id}>` : `<#${ticketChannel.id}>`}`
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
};