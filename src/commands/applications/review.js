const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Application = require('../../models/application/Application');
const AppID = require('../../models/application/AppID');
const Applied = require('../../models/application/Applied');
const logger = require('../../utils/logger');

module.exports = {
  name: 'review',
  description: 'Review a user\'s application',
  category: 'applications',
  aliases: ['appreview', 'viewapp', 'checkapp'],
  usage: '<application ID>',
  examples: ['review abc123'],
  userPermissions: [PermissionFlagsBits.ManageGuild],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('review')
    .setDescription('Review a user\'s application')
    .addStringOption(option => 
      option.setName('application_id')
        .setDescription('The ID of the application to review')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  
  // Slash command execution
  async execute(interaction) {
    try {
      // Get options
      const applicationId = interaction.options.getString('application_id');
      
      // Get application config
      const applicationSettings = await Application.findOne({ guildID: interaction.guild.id });
      
      // Check if application system is enabled
      if (!applicationSettings || !applicationSettings.appToggle) {
        return interaction.reply({
          content: 'The application system is not enabled on this server.',
          ephemeral: true
        });
      }
      
      // Find the application
      const appInfo = await AppID.findOne({
        guildID: interaction.guild.id,
        appID: applicationId
      });
      
      if (!appInfo) {
        return interaction.reply({
          content: 'Invalid application ID. Please check and try again.',
          ephemeral: true
        });
      }
      
      // Get the user
      const user = await interaction.client.users.fetch(appInfo.userID).catch(() => null);
      
      if (!user) {
        return interaction.reply({
          content: 'The user who submitted this application could not be found.',
          ephemeral: true
        });
      }
      
      // Create embed with application info
      const embed = new EmbedBuilder()
        .setTitle(`Application Review - ${user.tag}`)
        .setDescription(`Application ID: \`${applicationId}\`\nUser: <@${user.id}> (${user.id})`)
        .setColor('#3498db')
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .setTimestamp();
      
      // Fetch application information from logs
      let applicationDetails = null;
      
      if (applicationSettings.appLogs) {
        const logsChannel = interaction.guild.channels.cache.get(applicationSettings.appLogs);
        
        if (logsChannel) {
          try {
            // Fetch the last 100 messages from the logs channel
            const messages = await logsChannel.messages.fetch({ limit: 100 });
            
            // Find the application message
            const applicationMessage = messages.find(m => 
              m.embeds.length > 0 && 
              m.embeds[0].description && 
              m.embeds[0].description.includes(applicationId)
            );
            
            if (applicationMessage && applicationMessage.embeds.length > 0) {
              // Extract application details from the found message
              applicationDetails = applicationMessage.embeds[0];
              
              // Add application fields to our embed
              applicationDetails.fields.forEach(field => {
                if (field.name.startsWith('Question')) {
                  embed.addFields({ name: field.name, value: field.value });
                }
              });
            }
          } catch (error) {
            logger.error(`Error fetching application details: ${error}`);
          }
        }
      }
      
      if (!applicationDetails) {
        embed.addFields({ 
          name: 'Application Details', 
          value: 'Could not find detailed application information. It may have been deleted from the logs channel.'
        });
      }
      
      // Create action buttons
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`app_approve_${applicationId}`)
            .setLabel('Approve')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`app_decline_${applicationId}`)
            .setLabel('Decline')
            .setStyle(ButtonStyle.Danger)
        );
      
      // Check if application is still active
      const appliedInfo = await Applied.findOne({
        guildID: interaction.guild.id,
        userID: appInfo.userID,
        hasApplied: true
      });
      
      if (!appliedInfo) {
        // Application is no longer active
        embed.addFields({ 
          name: 'Status', 
          value: 'This application has already been processed.'
        });
        
        await interaction.reply({ embeds: [embed] });
      } else {
        // Application is still active
        embed.addFields({ 
          name: 'Status', 
          value: 'This application is pending review.'
        });
        
        await interaction.reply({ embeds: [embed], components: [row] });
      }
      
    } catch (error) {
      logger.error(`Error executing review command: ${error}`);
      await interaction.reply({ 
        content: 'There was an error executing this command!', 
        ephemeral: true 
      });
    }
  },
  
  // Legacy command execution
  async run(client, message, args) {
    try {
      // Check if application ID was provided
      if (!args.length) {
        return message.reply('Please provide an application ID.');
      }
      
      const applicationId = args[0];
      
      // Get application config
      const applicationSettings = await Application.findOne({ guildID: message.guild.id });
      
      // Check if application system is enabled
      if (!applicationSettings || !applicationSettings.appToggle) {
        return message.reply('The application system is not enabled on this server.');
      }
      
      // Find the application
      const appInfo = await AppID.findOne({
        guildID: message.guild.id,
        appID: applicationId
      });
      
      if (!appInfo) {
        return message.reply('Invalid application ID. Please check and try again.');
      }
      
      // Get the user
      const user = await client.users.fetch(appInfo.userID).catch(() => null);
      
      if (!user) {
        return message.reply('The user who submitted this application could not be found.');
      }
      
      // Create embed with application info
      const embed = new EmbedBuilder()
        .setTitle(`Application Review - ${user.tag}`)
        .setDescription(`Application ID: \`${applicationId}\`\nUser: <@${user.id}> (${user.id})`)
        .setColor('#3498db')
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .setTimestamp();
      
      // Fetch application information from logs
      let applicationDetails = null;
      
      if (applicationSettings.appLogs) {
        const logsChannel = message.guild.channels.cache.get(applicationSettings.appLogs);
        
        if (logsChannel) {
          try {
            // Fetch the last 100 messages from the logs channel
            const messages = await logsChannel.messages.fetch({ limit: 100 });
            
            // Find the application message
            const applicationMessage = messages.find(m => 
              m.embeds.length > 0 && 
              m.embeds[0].description && 
              m.embeds[0].description.includes(applicationId)
            );
            
            if (applicationMessage && applicationMessage.embeds.length > 0) {
              // Extract application details from the found message
              applicationDetails = applicationMessage.embeds[0];
              
              // Add application fields to our embed
              applicationDetails.fields.forEach(field => {
                if (field.name.startsWith('Question')) {
                  embed.addFields({ name: field.name, value: field.value });
                }
              });
            }
          } catch (error) {
            logger.error(`Error fetching application details: ${error}`);
          }
        }
      }
      
      if (!applicationDetails) {
        embed.addFields({ 
          name: 'Application Details', 
          value: 'Could not find detailed application information. It may have been deleted from the logs channel.'
        });
      }
      
      // Create action buttons
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`app_approve_${applicationId}`)
            .setLabel('Approve')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`app_decline_${applicationId}`)
            .setLabel('Decline')
            .setStyle(ButtonStyle.Danger)
        );
      
      // Check if application is still active
      const appliedInfo = await Applied.findOne({
        guildID: message.guild.id,
        userID: appInfo.userID,
        hasApplied: true
      });
      
      if (!appliedInfo) {
        // Application is no longer active
        embed.addFields({ 
          name: 'Status', 
          value: 'This application has already been processed.'
        });
        
        await message.reply({ embeds: [embed] });
      } else {
        // Application is still active
        embed.addFields({ 
          name: 'Status', 
          value: 'This application is pending review.'
        });
        
        await message.reply({ embeds: [embed], components: [row] });
      }
      
    } catch (error) {
      logger.error(`Error executing review command: ${error}`);
      message.reply('There was an error executing this command!');
    }
  }
};