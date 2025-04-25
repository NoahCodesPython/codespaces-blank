const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Application = require('../../models/application/Application');
const AppID = require('../../models/application/AppID');
const Applied = require('../../models/application/Applied');
const logger = require('../../utils/logger');

module.exports = {
  name: 'approve',
  description: 'Approve a user\'s application',
  category: 'applications',
  aliases: ['appapprove', 'acceptapp'],
  usage: '<application ID> [reason]',
  examples: ['approve abc123 Great application!'],
  userPermissions: [PermissionFlagsBits.ManageGuild],
  botPermissions: [PermissionFlagsBits.ManageRoles],
  
  data: new SlashCommandBuilder()
    .setName('approve')
    .setDescription('Approve a user\'s application')
    .addStringOption(option => 
      option.setName('application_id')
        .setDescription('The ID of the application to approve')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('The reason for approving the application')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  
  // Slash command execution
  async execute(interaction) {
    try {
      // Get options
      const applicationId = interaction.options.getString('application_id');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      
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
      
      // Check if user has already applied
      const appliedInfo = await Applied.findOne({
        guildID: interaction.guild.id,
        userID: appInfo.userID,
        hasApplied: true
      });
      
      if (!appliedInfo) {
        return interaction.reply({
          content: 'Could not find an active application for this user.',
          ephemeral: true
        });
      }
      
      // Get the user
      const user = await interaction.client.users.fetch(appInfo.userID).catch(() => null);
      const member = user ? await interaction.guild.members.fetch(user.id).catch(() => null) : null;
      
      if (!member) {
        return interaction.reply({
          content: 'The user who submitted this application is no longer in the server.',
          ephemeral: true
        });
      }
      
      // Mark application as not active
      appliedInfo.hasApplied = false;
      await appliedInfo.save();
      
      // Add role if configured
      if (applicationSettings.add_role) {
        const role = interaction.guild.roles.cache.get(applicationSettings.add_role);
        
        if (role && !member.roles.cache.has(role.id)) {
          await member.roles.add(role).catch(error => {
            logger.error(`Error adding role in approve command: ${error}`);
            return interaction.reply({
              content: `Could not add the configured role. Please check my permissions.`,
              ephemeral: true
            });
          });
        }
      }
      
      // Remove role if configured
      if (applicationSettings.remove_role) {
        const removeRole = interaction.guild.roles.cache.get(applicationSettings.remove_role);
        
        if (removeRole && member.roles.cache.has(removeRole.id)) {
          await member.roles.remove(removeRole).catch(error => {
            logger.error(`Error removing role in approve command: ${error}`);
          });
        }
      }
      
      // Notify user if DM is enabled
      if (applicationSettings.dm) {
        try {
          const dmEmbed = new EmbedBuilder()
            .setTitle(`Application Approved - ${interaction.guild.name}`)
            .setDescription(`Your application has been approved!`)
            .addFields({ name: 'Reason', value: reason })
            .setColor('#00FF00')
            .setTimestamp();
          
          await user.send({ embeds: [dmEmbed] }).catch(() => {
            // DM failed - just log and continue
            logger.warn(`Could not send DM to user ${user.tag} (${user.id})`);
          });
        } catch (error) {
          logger.error(`Error sending DM in approve command: ${error}`);
        }
      }
      
      // Log to the application log channel
      if (applicationSettings.appLogs) {
        const logChannel = interaction.guild.channels.cache.get(applicationSettings.appLogs);
        
        if (logChannel) {
          const logEmbed = new EmbedBuilder()
            .setTitle('Application Approved')
            .setDescription(`Application ID: \`${applicationId}\``)
            .addFields(
              { name: 'User', value: `<@${user.id}> (${user.tag})` },
              { name: 'Approved By', value: `<@${interaction.user.id}> (${interaction.user.tag})` },
              { name: 'Reason', value: reason }
            )
            .setColor('#00FF00')
            .setTimestamp();
          
          await logChannel.send({ embeds: [logEmbed] }).catch(error => {
            logger.error(`Error sending log in approve command: ${error}`);
          });
        }
      }
      
      // Reply to interaction
      const embed = new EmbedBuilder()
        .setTitle('Application Approved')
        .setDescription(`✅ Successfully approved the application for <@${user.id}>.`)
        .addFields({ name: 'Reason', value: reason })
        .setColor('#00FF00')
        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing approve command: ${error}`);
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
      const reason = args.slice(1).join(' ') || 'No reason provided';
      
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
      
      // Check if user has already applied
      const appliedInfo = await Applied.findOne({
        guildID: message.guild.id,
        userID: appInfo.userID,
        hasApplied: true
      });
      
      if (!appliedInfo) {
        return message.reply('Could not find an active application for this user.');
      }
      
      // Get the user
      const user = await client.users.fetch(appInfo.userID).catch(() => null);
      const member = user ? await message.guild.members.fetch(user.id).catch(() => null) : null;
      
      if (!member) {
        return message.reply('The user who submitted this application is no longer in the server.');
      }
      
      // Mark application as not active
      appliedInfo.hasApplied = false;
      await appliedInfo.save();
      
      // Add role if configured
      if (applicationSettings.add_role) {
        const role = message.guild.roles.cache.get(applicationSettings.add_role);
        
        if (role && !member.roles.cache.has(role.id)) {
          await member.roles.add(role).catch(error => {
            logger.error(`Error adding role in approve command: ${error}`);
            return message.reply('Could not add the configured role. Please check my permissions.');
          });
        }
      }
      
      // Remove role if configured
      if (applicationSettings.remove_role) {
        const removeRole = message.guild.roles.cache.get(applicationSettings.remove_role);
        
        if (removeRole && member.roles.cache.has(removeRole.id)) {
          await member.roles.remove(removeRole).catch(error => {
            logger.error(`Error removing role in approve command: ${error}`);
          });
        }
      }
      
      // Notify user if DM is enabled
      if (applicationSettings.dm) {
        try {
          const dmEmbed = new EmbedBuilder()
            .setTitle(`Application Approved - ${message.guild.name}`)
            .setDescription(`Your application has been approved!`)
            .addFields({ name: 'Reason', value: reason })
            .setColor('#00FF00')
            .setTimestamp();
          
          await user.send({ embeds: [dmEmbed] }).catch(() => {
            // DM failed - just log and continue
            logger.warn(`Could not send DM to user ${user.tag} (${user.id})`);
          });
        } catch (error) {
          logger.error(`Error sending DM in approve command: ${error}`);
        }
      }
      
      // Log to the application log channel
      if (applicationSettings.appLogs) {
        const logChannel = message.guild.channels.cache.get(applicationSettings.appLogs);
        
        if (logChannel) {
          const logEmbed = new EmbedBuilder()
            .setTitle('Application Approved')
            .setDescription(`Application ID: \`${applicationId}\``)
            .addFields(
              { name: 'User', value: `<@${user.id}> (${user.tag})` },
              { name: 'Approved By', value: `<@${message.author.id}> (${message.author.tag})` },
              { name: 'Reason', value: reason }
            )
            .setColor('#00FF00')
            .setTimestamp();
          
          await logChannel.send({ embeds: [logEmbed] }).catch(error => {
            logger.error(`Error sending log in approve command: ${error}`);
          });
        }
      }
      
      // Reply to message
      const embed = new EmbedBuilder()
        .setTitle('Application Approved')
        .setDescription(`✅ Successfully approved the application for <@${user.id}>.`)
        .addFields({ name: 'Reason', value: reason })
        .setColor('#00FF00')
        .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTimestamp();
      
      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing approve command: ${error}`);
      message.reply('There was an error executing this command!');
    }
  }
};