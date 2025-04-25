const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const TicketSettings = require('../../models/ticket/TicketSettings');
const logger = require('../../utils/logger');

module.exports = {
  name: 'ticketsettings',
  description: 'View ticket system settings for the server',
  category: 'ticket',
  aliases: ['ticketconfig', 'ticketinfo'],
  usage: '',
  examples: ['ticketsettings'],
  userPermissions: [PermissionFlagsBits.ManageChannels],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('ticketsettings')
    .setDescription('View ticket system settings for the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  
  // Slash command execution
  async execute(interaction) {
    try {
      // Defer reply
      await interaction.deferReply();
      
      const guildID = interaction.guild.id;
      
      // Get ticket settings
      const settings = await TicketSettings.findOne({ guildID });
      
      if (!settings) {
        return interaction.editReply('The ticket system is not set up for this server. Use `/ticketsetup` to configure it.');
      }
      
      // Get channel and role information
      const category = settings.category ? await interaction.guild.channels.fetch(settings.category).catch(() => null) : null;
      const supportRole = settings.supportRole ? await interaction.guild.roles.fetch(settings.supportRole).catch(() => null) : null;
      const transcriptChannel = settings.transcriptChannel ? await interaction.guild.channels.fetch(settings.transcriptChannel).catch(() => null) : null;
      const ticketChannel = settings.ticketChannel ? await interaction.guild.channels.fetch(settings.ticketChannel).catch(() => null) : null;
      const ticketLogs = settings.ticketLogs ? await interaction.guild.channels.fetch(settings.ticketLogs).catch(() => null) : null;
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle('Ticket System Settings')
        .setColor('#0099ff')
        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
        .setTimestamp();
      
      // Add basic settings
      embed.addFields(
        { name: 'Status', value: settings.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
        { name: 'Ticket Count', value: `${settings.ticketCount}`, inline: true },
        { name: 'User Ticket Limit', value: `${settings.userTicketLimit}`, inline: true },
        { name: 'Using Threads', value: settings.useThreads ? 'Yes' : 'No', inline: true },
        { name: 'Category', value: category ? `<#${category.id}>` : 'Not set', inline: true },
        { name: 'Support Role', value: supportRole ? `<@&${supportRole.id}>` : 'Not set', inline: true },
        { name: 'Ticket Channel', value: ticketChannel ? `<#${ticketChannel.id}>` : 'Not set', inline: true },
        { name: 'Transcript Channel', value: transcriptChannel ? `<#${transcriptChannel.id}>` : 'Not set', inline: true },
        { name: 'Logs Channel', value: ticketLogs ? `<#${ticketLogs.id}>` : 'Not set', inline: true }
      );
      
      // Add appearance settings
      embed.addFields(
        { name: 'Button Color', value: settings.buttonColor || 'Primary', inline: true },
        { name: 'Button Emoji', value: settings.buttonEmoji || '🎫', inline: true },
        { name: 'Button Label', value: settings.buttonLabel || 'Create Ticket', inline: true }
      );
      
      // Add messages
      embed.addFields(
        { name: 'Ticket Description', value: `\`\`\`${settings.ticketDescription || 'Click the button below to create a support ticket.'}\`\`\``, inline: false },
        { name: 'Welcome Message', value: `\`\`\`${settings.ticketWelcomeMessage || 'Thanks for creating a ticket! Support staff will be with you shortly.'}\`\`\``, inline: false }
      );
      
      // Add ticket supporters
      if (settings.ticketSupporters && settings.ticketSupporters.length > 0) {
        const supporters = [];
        
        for (const supporterID of settings.ticketSupporters) {
          try {
            const supporter = await interaction.client.users.fetch(supporterID);
            supporters.push(`${supporter.tag} (${supporter.id})`);
          } catch {
            supporters.push(`Unknown User (${supporterID})`);
          }
        }
        
        embed.addFields({
          name: 'Ticket Supporters',
          value: supporters.join('\n') || 'None',
          inline: false
        });
      }
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error in ticketsettings command: ${error}`);
      
      if (interaction.deferred) {
        await interaction.editReply({ 
          content: 'There was an error retrieving the ticket settings.'
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
      
      // Get ticket settings
      const settings = await TicketSettings.findOne({ guildID });
      
      if (!settings) {
        return message.reply('The ticket system is not set up for this server. Use the slash command `/ticketsetup` to configure it.');
      }
      
      // Get channel and role information
      const category = settings.category ? await message.guild.channels.fetch(settings.category).catch(() => null) : null;
      const supportRole = settings.supportRole ? await message.guild.roles.fetch(settings.supportRole).catch(() => null) : null;
      const transcriptChannel = settings.transcriptChannel ? await message.guild.channels.fetch(settings.transcriptChannel).catch(() => null) : null;
      const ticketChannel = settings.ticketChannel ? await message.guild.channels.fetch(settings.ticketChannel).catch(() => null) : null;
      const ticketLogs = settings.ticketLogs ? await message.guild.channels.fetch(settings.ticketLogs).catch(() => null) : null;
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle('Ticket System Settings')
        .setColor('#0099ff')
        .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTimestamp();
      
      // Add basic settings
      embed.addFields(
        { name: 'Status', value: settings.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
        { name: 'Ticket Count', value: `${settings.ticketCount}`, inline: true },
        { name: 'User Ticket Limit', value: `${settings.userTicketLimit}`, inline: true },
        { name: 'Using Threads', value: settings.useThreads ? 'Yes' : 'No', inline: true },
        { name: 'Category', value: category ? `<#${category.id}>` : 'Not set', inline: true },
        { name: 'Support Role', value: supportRole ? `<@&${supportRole.id}>` : 'Not set', inline: true },
        { name: 'Ticket Channel', value: ticketChannel ? `<#${ticketChannel.id}>` : 'Not set', inline: true },
        { name: 'Transcript Channel', value: transcriptChannel ? `<#${transcriptChannel.id}>` : 'Not set', inline: true },
        { name: 'Logs Channel', value: ticketLogs ? `<#${ticketLogs.id}>` : 'Not set', inline: true }
      );
      
      // Add appearance settings
      embed.addFields(
        { name: 'Button Color', value: settings.buttonColor || 'Primary', inline: true },
        { name: 'Button Emoji', value: settings.buttonEmoji || '🎫', inline: true },
        { name: 'Button Label', value: settings.buttonLabel || 'Create Ticket', inline: true }
      );
      
      // Add messages
      embed.addFields(
        { name: 'Ticket Description', value: `\`\`\`${settings.ticketDescription || 'Click the button below to create a support ticket.'}\`\`\``, inline: false },
        { name: 'Welcome Message', value: `\`\`\`${settings.ticketWelcomeMessage || 'Thanks for creating a ticket! Support staff will be with you shortly.'}\`\`\``, inline: false }
      );
      
      // Add ticket supporters
      if (settings.ticketSupporters && settings.ticketSupporters.length > 0) {
        const supporters = [];
        
        for (const supporterID of settings.ticketSupporters) {
          try {
            const supporter = await client.users.fetch(supporterID);
            supporters.push(`${supporter.tag} (${supporter.id})`);
          } catch {
            supporters.push(`Unknown User (${supporterID})`);
          }
        }
        
        embed.addFields({
          name: 'Ticket Supporters',
          value: supporters.join('\n') || 'None',
          inline: false
        });
      }
      
      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error in legacy ticketsettings command: ${error}`);
      message.reply('There was an error retrieving the ticket settings.');
    }
  }
};