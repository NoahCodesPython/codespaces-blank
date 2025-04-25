const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const SuggestionSettings = require('../../models/SuggestionSettings');
const logger = require('../../utils/logger');

module.exports = {
  name: 'suggestionsetup',
  description: 'Configure the suggestion system for your server',
  category: 'config',
  aliases: ['setupsuggestions', 'suggestsetup'],
  usage: '<channel> [role]',
  examples: ['suggestionsetup #suggestions @Moderator', 'suggestionsetup #feedback'],
  userPermissions: [PermissionFlagsBits.ManageGuild],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('suggestionsetup')
    .setDescription('Configure the suggestion system for your server')
    .addSubcommand(subcommand =>
      subcommand
        .setName('enable')
        .setDescription('Enable the suggestion system')
        .addChannelOption(option =>
          option.setName('channel')
            .setDescription('The channel for suggestions')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true))
        .addRoleOption(option =>
          option.setName('manager_role')
            .setDescription('The role that can manage suggestions')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('disable')
        .setDescription('Disable the suggestion system'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('settings')
        .setDescription('Configure additional suggestion settings')
        .addBooleanOption(option =>
          option.setName('anonymous')
            .setDescription('Whether suggestions should be anonymous')
            .setRequired(false))
        .addBooleanOption(option =>
          option.setName('self_vote')
            .setDescription('Whether users can vote on their own suggestions')
            .setRequired(false))
        .addBooleanOption(option =>
          option.setName('change_vote')
            .setDescription('Whether users can change their votes')
            .setRequired(false))
        .addBooleanOption(option =>
          option.setName('dm_notification')
            .setDescription('Whether to send DM notifications for suggestion updates')
            .setRequired(false)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  
  // Slash command execution
  async execute(interaction) {
    try {
      const subcommand = interaction.options.getSubcommand();
      
      if (subcommand === 'enable') {
        const channel = interaction.options.getChannel('channel');
        const managerRole = interaction.options.getRole('manager_role');
        
        // Check if the bot has permission to send messages in the channel
        const permissions = channel.permissionsFor(interaction.guild.members.me);
        if (!permissions.has(PermissionFlagsBits.SendMessages) || !permissions.has(PermissionFlagsBits.ViewChannel)) {
          return interaction.reply({
            content: `I don't have permission to send messages in ${channel}! Please give me the appropriate permissions.`,
            ephemeral: true
          });
        }
        
        // Get or create settings
        let settings = await SuggestionSettings.findOne({ guildID: interaction.guild.id });
        
        if (!settings) {
          settings = new SuggestionSettings({
            guildID: interaction.guild.id
          });
        }
        
        // Update settings
        settings.enabled = true;
        settings.suggestionChannel = channel.id;
        if (managerRole) settings.managerRole = managerRole.id;
        
        await settings.save();
        
        // Create embed
        const embed = new EmbedBuilder()
          .setTitle('Suggestion System Enabled')
          .setDescription(`Suggestions will now be sent to ${channel}`)
          .setColor('#00FF00')
          .addFields(
            { name: 'Manager Role', value: managerRole ? `<@&${managerRole.id}>` : 'Not set (only administrators can manage suggestions)', inline: true }
          )
          .setFooter({ text: 'Users can use /suggest to submit suggestions' })
          .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
        
      } else if (subcommand === 'disable') {
        // Get settings
        const settings = await SuggestionSettings.findOne({ guildID: interaction.guild.id });
        
        if (!settings || !settings.enabled) {
          return interaction.reply({
            content: 'The suggestion system is already disabled!',
            ephemeral: true
          });
        }
        
        // Update settings
        settings.enabled = false;
        await settings.save();
        
        await interaction.reply({
          content: 'The suggestion system has been disabled. Existing suggestions will remain in the database.',
          ephemeral: true
        });
        
      } else if (subcommand === 'settings') {
        // Get settings
        let settings = await SuggestionSettings.findOne({ guildID: interaction.guild.id });
        
        if (!settings) {
          return interaction.reply({
            content: 'Please enable the suggestion system first with `/suggestionsetup enable`!',
            ephemeral: true
          });
        }
        
        // Get options
        const anonymous = interaction.options.getBoolean('anonymous');
        const selfVote = interaction.options.getBoolean('self_vote');
        const changeVote = interaction.options.getBoolean('change_vote');
        const dmNotification = interaction.options.getBoolean('dm_notification');
        
        // Update settings if provided
        let updated = false;
        
        if (anonymous !== null) {
          settings.anonymous = anonymous;
          updated = true;
        }
        
        if (selfVote !== null) {
          settings.allowSelfVote = selfVote;
          updated = true;
        }
        
        if (changeVote !== null) {
          settings.allowChangeVote = changeVote;
          updated = true;
        }
        
        if (dmNotification !== null) {
          settings.dmNotification = dmNotification;
          updated = true;
        }
        
        if (!updated) {
          // Just show current settings
          const embed = new EmbedBuilder()
            .setTitle('Suggestion System Settings')
            .setColor('#0099ff')
            .addFields(
              { name: 'Status', value: settings.enabled ? 'Enabled' : 'Disabled', inline: true },
              { name: 'Channel', value: settings.suggestionChannel ? `<#${settings.suggestionChannel}>` : 'Not set', inline: true },
              { name: 'Manager Role', value: settings.managerRole ? `<@&${settings.managerRole}>` : 'Not set', inline: true },
              { name: 'Anonymous Suggestions', value: settings.anonymous ? 'Yes' : 'No', inline: true },
              { name: 'Self-voting', value: settings.allowSelfVote ? 'Allowed' : 'Not allowed', inline: true },
              { name: 'Change Vote', value: settings.allowChangeVote ? 'Allowed' : 'Not allowed', inline: true },
              { name: 'DM Notifications', value: settings.dmNotification ? 'Enabled' : 'Disabled', inline: true }
            )
            .setFooter({ text: 'Use /suggestionsetup settings with options to update settings' })
            .setTimestamp();
          
          return interaction.reply({ embeds: [embed] });
        }
        
        // Save updated settings
        await settings.save();
        
        // Create embed
        const embed = new EmbedBuilder()
          .setTitle('Suggestion System Settings Updated')
          .setColor('#00FF00')
          .setDescription('The following settings have been updated:')
          .setTimestamp();
        
        // Add fields for updated settings
        if (anonymous !== null) {
          embed.addFields({ name: 'Anonymous Suggestions', value: anonymous ? 'Enabled' : 'Disabled', inline: true });
        }
        
        if (selfVote !== null) {
          embed.addFields({ name: 'Self-voting', value: selfVote ? 'Allowed' : 'Not allowed', inline: true });
        }
        
        if (changeVote !== null) {
          embed.addFields({ name: 'Change Vote', value: changeVote ? 'Allowed' : 'Not allowed', inline: true });
        }
        
        if (dmNotification !== null) {
          embed.addFields({ name: 'DM Notifications', value: dmNotification ? 'Enabled' : 'Disabled', inline: true });
        }
        
        await interaction.reply({ embeds: [embed] });
      }
      
    } catch (error) {
      logger.error(`Error in suggestionsetup command: ${error}`);
      await interaction.reply({
        content: 'There was an error setting up the suggestion system!',
        ephemeral: true
      });
    }
  },
  
  // Legacy command execution
  async run(client, message, args) {
    try {
      // Check for required permissions
      if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return message.reply('You need the **Manage Server** permission to use this command!');
      }
      
      // Parse subcommand
      const subcommand = args[0]?.toLowerCase();
      
      if (!subcommand || !['enable', 'disable', 'settings'].includes(subcommand)) {
        return message.reply('Please specify a valid subcommand: `enable`, `disable`, or `settings`!');
      }
      
      if (subcommand === 'enable') {
        // Parse channel mention
        const channelMention = args[1];
        
        if (!channelMention) {
          return message.reply('Please mention a channel for suggestions!');
        }
        
        // Extract channel ID from mention
        const channelId = channelMention.replace(/[<#>]/g, '');
        const channel = message.guild.channels.cache.get(channelId);
        
        if (!channel || channel.type !== ChannelType.GuildText) {
          return message.reply('Please mention a valid text channel!');
        }
        
        // Parse role mention (optional)
        let managerRole = null;
        const roleMention = args[2];
        
        if (roleMention) {
          const roleId = roleMention.replace(/[<@&>]/g, '');
          managerRole = message.guild.roles.cache.get(roleId);
          
          if (!managerRole) {
            return message.reply('Please mention a valid role!');
          }
        }
        
        // Check if the bot has permission to send messages in the channel
        const permissions = channel.permissionsFor(message.guild.members.me);
        if (!permissions.has(PermissionFlagsBits.SendMessages) || !permissions.has(PermissionFlagsBits.ViewChannel)) {
          return message.reply(`I don't have permission to send messages in ${channel}! Please give me the appropriate permissions.`);
        }
        
        // Get or create settings
        let settings = await SuggestionSettings.findOne({ guildID: message.guild.id });
        
        if (!settings) {
          settings = new SuggestionSettings({
            guildID: message.guild.id
          });
        }
        
        // Update settings
        settings.enabled = true;
        settings.suggestionChannel = channel.id;
        if (managerRole) settings.managerRole = managerRole.id;
        
        await settings.save();
        
        // Create embed
        const embed = new EmbedBuilder()
          .setTitle('Suggestion System Enabled')
          .setDescription(`Suggestions will now be sent to ${channel}`)
          .setColor('#00FF00')
          .addFields(
            { name: 'Manager Role', value: managerRole ? `<@&${managerRole.id}>` : 'Not set (only administrators can manage suggestions)', inline: true }
          )
          .setFooter({ text: 'Users can use !suggest to submit suggestions' })
          .setTimestamp();
        
        await message.reply({ embeds: [embed] });
        
      } else if (subcommand === 'disable') {
        // Get settings
        const settings = await SuggestionSettings.findOne({ guildID: message.guild.id });
        
        if (!settings || !settings.enabled) {
          return message.reply('The suggestion system is already disabled!');
        }
        
        // Update settings
        settings.enabled = false;
        await settings.save();
        
        await message.reply('The suggestion system has been disabled. Existing suggestions will remain in the database.');
        
      } else if (subcommand === 'settings') {
        // Get settings
        let settings = await SuggestionSettings.findOne({ guildID: message.guild.id });
        
        if (!settings) {
          return message.reply('Please enable the suggestion system first with `!suggestionsetup enable`!');
        }
        
        // Parse options
        const options = {};
        let i = 1;
        
        while (i < args.length) {
          const option = args[i].toLowerCase();
          
          switch (option) {
            case 'anonymous':
              options.anonymous = args[i+1]?.toLowerCase() === 'true' || args[i+1]?.toLowerCase() === 'yes';
              i += 2;
              break;
            case 'selfvote':
              options.selfVote = args[i+1]?.toLowerCase() === 'true' || args[i+1]?.toLowerCase() === 'yes';
              i += 2;
              break;
            case 'changevote':
              options.changeVote = args[i+1]?.toLowerCase() === 'true' || args[i+1]?.toLowerCase() === 'yes';
              i += 2;
              break;
            case 'dmnotification':
              options.dmNotification = args[i+1]?.toLowerCase() === 'true' || args[i+1]?.toLowerCase() === 'yes';
              i += 2;
              break;
            default:
              i++;
              break;
          }
        }
        
        // Update settings if provided
        let updated = false;
        
        if ('anonymous' in options) {
          settings.anonymous = options.anonymous;
          updated = true;
        }
        
        if ('selfVote' in options) {
          settings.allowSelfVote = options.selfVote;
          updated = true;
        }
        
        if ('changeVote' in options) {
          settings.allowChangeVote = options.changeVote;
          updated = true;
        }
        
        if ('dmNotification' in options) {
          settings.dmNotification = options.dmNotification;
          updated = true;
        }
        
        if (!updated) {
          // Just show current settings
          const embed = new EmbedBuilder()
            .setTitle('Suggestion System Settings')
            .setColor('#0099ff')
            .addFields(
              { name: 'Status', value: settings.enabled ? 'Enabled' : 'Disabled', inline: true },
              { name: 'Channel', value: settings.suggestionChannel ? `<#${settings.suggestionChannel}>` : 'Not set', inline: true },
              { name: 'Manager Role', value: settings.managerRole ? `<@&${settings.managerRole}>` : 'Not set', inline: true },
              { name: 'Anonymous Suggestions', value: settings.anonymous ? 'Yes' : 'No', inline: true },
              { name: 'Self-voting', value: settings.allowSelfVote ? 'Allowed' : 'Not allowed', inline: true },
              { name: 'Change Vote', value: settings.allowChangeVote ? 'Allowed' : 'Not allowed', inline: true },
              { name: 'DM Notifications', value: settings.dmNotification ? 'Enabled' : 'Disabled', inline: true }
            )
            .setFooter({ text: 'Use !suggestionsetup settings with options to update settings' })
            .setTimestamp();
          
          return message.reply({ embeds: [embed] });
        }
        
        // Save updated settings
        await settings.save();
        
        // Create embed
        const embed = new EmbedBuilder()
          .setTitle('Suggestion System Settings Updated')
          .setColor('#00FF00')
          .setDescription('The following settings have been updated:')
          .setTimestamp();
        
        // Add fields for updated settings
        if ('anonymous' in options) {
          embed.addFields({ name: 'Anonymous Suggestions', value: options.anonymous ? 'Enabled' : 'Disabled', inline: true });
        }
        
        if ('selfVote' in options) {
          embed.addFields({ name: 'Self-voting', value: options.selfVote ? 'Allowed' : 'Not allowed', inline: true });
        }
        
        if ('changeVote' in options) {
          embed.addFields({ name: 'Change Vote', value: options.changeVote ? 'Allowed' : 'Not allowed', inline: true });
        }
        
        if ('dmNotification' in options) {
          embed.addFields({ name: 'DM Notifications', value: options.dmNotification ? 'Enabled' : 'Disabled', inline: true });
        }
        
        await message.reply({ embeds: [embed] });
      }
      
    } catch (error) {
      logger.error(`Error in legacy suggestionsetup command: ${error}`);
      message.reply('There was an error setting up the suggestion system!');
    }
  }
};