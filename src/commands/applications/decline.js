const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Application = require('../../models/application/Application');
const AppID = require('../../models/application/AppID');
const Applied = require('../../models/application/Applied');
const logger = require('../../utils/logger');

module.exports = {
  name: 'decline',
  description: 'Decline a user\'s application',
  category: 'applications',
  aliases: ['appdecline', 'rejectapp', 'denyapp'],
  usage: '<application ID> [reason]',
  examples: ['decline abc123 Not enough experience'],
  userPermissions: [PermissionFlagsBits.ManageGuild],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('decline')
    .setDescription('Decline a user\'s application')
    .addStringOption(option => 
      option.setName('application_id')
        .setDescription('The ID of the application to decline')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('The reason for declining the application')
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
      
      if (!user) {
        return interaction.reply({
          content: 'The user who submitted this application could not be found.',
          ephemeral: true
        });
      }
      
      // Mark application as not active
      appliedInfo.hasApplied = false;
      await appliedInfo.save();
      
      // Notify user if DM is enabled
      if (applicationSettings.dm) {
        try {
          const dmEmbed = new EmbedBuilder()
            .setTitle(`Application Declined - ${interaction.guild.name}`)
            .setDescription(`Your application has been declined.`)
            .addFields({ name: 'Reason', value: reason })
            .setColor('#FF0000')
            .setTimestamp();
          
          await user.send({ embeds: [dmEmbed] }).catch(() => {
            // DM failed - just log and continue
            logger.warn(`Could not send DM to user ${user.tag} (${user.id})`);
          });
        } catch (error) {
          logger.error(`Error sending DM in decline command: ${error}`);
        }
      }
      
      // Log to the application log channel
      if (applicationSettings.appLogs) {
        const logChannel = interaction.guild.channels.cache.get(applicationSettings.appLogs);
        
        if (logChannel) {
          const logEmbed = new EmbedBuilder()
            .setTitle('Application Declined')
            .setDescription(`Application ID: \`${applicationId}\``)
            .addFields(
              { name: 'User', value: `<@${user.id}> (${user.tag})` },
              { name: 'Declined By', value: `<@${interaction.user.id}> (${interaction.user.tag})` },
              { name: 'Reason', value: reason }
            )
            .setColor('#FF0000')
            .setTimestamp();
          
          await logChannel.send({ embeds: [logEmbed] }).catch(error => {
            logger.error(`Error sending log in decline command: ${error}`);
          });
        }
      }
      
      // Reply to interaction
      const embed = new EmbedBuilder()
        .setTitle('Application Declined')
        .setDescription(`❌ The application for <@${user.id}> has been declined.`)
        .addFields({ name: 'Reason', value: reason })
        .setColor('#FF0000')
        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing decline command: ${error}`);
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
      
      if (!user) {
        return message.reply('The user who submitted this application could not be found.');
      }
      
      // Mark application as not active
      appliedInfo.hasApplied = false;
      await appliedInfo.save();
      
      // Notify user if DM is enabled
      if (applicationSettings.dm) {
        try {
          const dmEmbed = new EmbedBuilder()
            .setTitle(`Application Declined - ${message.guild.name}`)
            .setDescription(`Your application has been declined.`)
            .addFields({ name: 'Reason', value: reason })
            .setColor('#FF0000')
            .setTimestamp();
          
          await user.send({ embeds: [dmEmbed] }).catch(() => {
            // DM failed - just log and continue
            logger.warn(`Could not send DM to user ${user.tag} (${user.id})`);
          });
        } catch (error) {
          logger.error(`Error sending DM in decline command: ${error}`);
        }
      }
      
      // Log to the application log channel
      if (applicationSettings.appLogs) {
        const logChannel = message.guild.channels.cache.get(applicationSettings.appLogs);
        
        if (logChannel) {
          const logEmbed = new EmbedBuilder()
            .setTitle('Application Declined')
            .setDescription(`Application ID: \`${applicationId}\``)
            .addFields(
              { name: 'User', value: `<@${user.id}> (${user.tag})` },
              { name: 'Declined By', value: `<@${message.author.id}> (${message.author.tag})` },
              { name: 'Reason', value: reason }
            )
            .setColor('#FF0000')
            .setTimestamp();
          
          await logChannel.send({ embeds: [logEmbed] }).catch(error => {
            logger.error(`Error sending log in decline command: ${error}`);
          });
        }
      }
      
      // Reply to message
      const embed = new EmbedBuilder()
        .setTitle('Application Declined')
        .setDescription(`❌ The application for <@${user.id}> has been declined.`)
        .addFields({ name: 'Reason', value: reason })
        .setColor('#FF0000')
        .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTimestamp();
      
      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing decline command: ${error}`);
      message.reply('There was an error executing this command!');
    }
  }
};