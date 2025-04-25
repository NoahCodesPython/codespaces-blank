const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const TempVC = require('../../models/TempVC');
const logger = require('../../utils/logger');

module.exports = {
  name: 'tempvc',
  description: 'Configure the temporary voice channel system',
  category: 'config',
  aliases: ['temporaryvc', 'tempvoice', 'jointocreate'],
  usage: '<enable/disable/settings> [options]',
  examples: [
    'tempvc enable #Join To Create',
    'tempvc disable',
    'tempvc settings nameFormat {username}\'s Room',
    'tempvc settings userLimit 5'
  ],
  userPermissions: [PermissionFlagsBits.ManageGuild],
  botPermissions: [PermissionFlagsBits.ManageChannels],
  
  data: new SlashCommandBuilder()
    .setName('tempvc')
    .setDescription('Configure the temporary voice channel system')
    .addSubcommand(subcommand =>
      subcommand
        .setName('enable')
        .setDescription('Enable temporary voice channels')
        .addChannelOption(option =>
          option.setName('join_channel')
            .setDescription('The voice channel users join to create their own channel')
            .addChannelTypes(ChannelType.GuildVoice)
            .setRequired(true))
        .addChannelOption(option =>
          option.setName('category')
            .setDescription('The category to create new voice channels in')
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('disable')
        .setDescription('Disable temporary voice channels'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('settings')
        .setDescription('Configure settings for temporary voice channels')
        .addStringOption(option =>
          option.setName('name_format')
            .setDescription('Format for new channel names. Use {username}, {game}, {count}')
            .setRequired(false))
        .addIntegerOption(option =>
          option.setName('user_limit')
            .setDescription('Default user limit for new channels (0 = unlimited)')
            .setRequired(false)
            .setMinValue(0)
            .setMaxValue(99))
        .addBooleanOption(option =>
          option.setName('private')
            .setDescription('Whether new channels are private by default')
            .setRequired(false)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  
  // Slash command execution
  async execute(interaction) {
    try {
      const subcommand = interaction.options.getSubcommand();
      
      // Get or create TempVC settings
      let settings = await TempVC.findOne({ guildID: interaction.guild.id });
      
      if (!settings) {
        settings = new TempVC({
          guildID: interaction.guild.id
        });
      }
      
      if (subcommand === 'enable') {
        const joinChannel = interaction.options.getChannel('join_channel');
        const category = interaction.options.getChannel('category');
        
        // Check permissions
        if (joinChannel) {
          const permissions = joinChannel.permissionsFor(interaction.guild.members.me);
          if (!permissions.has(PermissionFlagsBits.Connect) || !permissions.has(PermissionFlagsBits.ViewChannel)) {
            return interaction.reply({
              content: `I don't have permission to connect to or view ${joinChannel}! Please give me the appropriate permissions.`,
              ephemeral: true
            });
          }
        }
        
        if (category) {
          const permissions = category.permissionsFor(interaction.guild.members.me);
          if (!permissions.has(PermissionFlagsBits.ManageChannels) || !permissions.has(PermissionFlagsBits.ViewChannel)) {
            return interaction.reply({
              content: `I don't have permission to manage channels in ${category}! Please give me the appropriate permissions.`,
              ephemeral: true
            });
          }
        }
        
        // Update settings
        settings.enabled = true;
        settings.joinChannelID = joinChannel.id;
        if (category) settings.categoryID = category.id;
        
        await settings.save();
        
        // Create embed
        const embed = new EmbedBuilder()
          .setTitle('Temporary Voice Channels Enabled')
          .setDescription(`Temporary voice channels have been enabled. Users who join ${joinChannel} will get their own voice channel.`)
          .setColor('#00FF00')
          .addFields(
            { name: 'Join Channel', value: `<#${joinChannel.id}>`, inline: true },
            { name: 'Category', value: category ? `<#${category.id}>` : 'None (using same category as join channel)', inline: true },
            { name: 'Name Format', value: `\`${settings.defaults.nameFormat}\``, inline: true },
            { name: 'User Limit', value: settings.defaults.userLimit === 0 ? 'Unlimited' : `${settings.defaults.userLimit}`, inline: true },
            { name: 'Private by Default', value: settings.defaults.private ? 'Yes' : 'No', inline: true }
          )
          .setFooter({ text: 'Use /tempvc settings to configure channel settings' })
          .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
        
      } else if (subcommand === 'disable') {
        // Check if already disabled
        if (!settings.enabled) {
          return interaction.reply({
            content: 'Temporary voice channels are already disabled!',
            ephemeral: true
          });
        }
        
        // Update settings
        settings.enabled = false;
        await settings.save();
        
        // Delete any active temporary channels
        const activeChannels = settings.tempChannels || [];
        let deletedCount = 0;
        
        for (const tempChannel of activeChannels) {
          try {
            const channel = await interaction.guild.channels.fetch(tempChannel.channelID).catch(() => null);
            if (channel) {
              await channel.delete('Temporary Voice Channel system disabled');
              deletedCount++;
            }
          } catch (error) {
            logger.error(`Error deleting temporary channel: ${error}`);
          }
        }
        
        // Clear temp channels array
        settings.tempChannels = [];
        await settings.save();
        
        await interaction.reply({
          content: `Temporary voice channels have been disabled. ${deletedCount} active temporary channels have been deleted.`,
          ephemeral: true
        });
        
      } else if (subcommand === 'settings') {
        const nameFormat = interaction.options.getString('name_format');
        const userLimit = interaction.options.getInteger('user_limit');
        const privateDefault = interaction.options.getBoolean('private');
        
        // Check if system is enabled
        if (!settings.enabled) {
          return interaction.reply({
            content: 'The temporary voice channel system is not enabled! Enable it first with `/tempvc enable`.',
            ephemeral: true
          });
        }
        
        // Update settings if provided
        let updated = false;
        
        if (nameFormat !== null) {
          settings.defaults.nameFormat = nameFormat;
          updated = true;
        }
        
        if (userLimit !== null) {
          settings.defaults.userLimit = userLimit;
          updated = true;
        }
        
        if (privateDefault !== null) {
          settings.defaults.private = privateDefault;
          updated = true;
        }
        
        if (!updated) {
          // Just show current settings
          const embed = new EmbedBuilder()
            .setTitle('Temporary Voice Channel Settings')
            .setColor('#0099ff')
            .addFields(
              { name: 'Status', value: settings.enabled ? 'Enabled' : 'Disabled', inline: true },
              { name: 'Join Channel', value: settings.joinChannelID ? `<#${settings.joinChannelID}>` : 'Not set', inline: true },
              { name: 'Category', value: settings.categoryID ? `<#${settings.categoryID}>` : 'Using join channel category', inline: true },
              { name: 'Name Format', value: `\`${settings.defaults.nameFormat}\``, inline: true },
              { name: 'User Limit', value: settings.defaults.userLimit === 0 ? 'Unlimited' : `${settings.defaults.userLimit}`, inline: true },
              { name: 'Private by Default', value: settings.defaults.private ? 'Yes' : 'No', inline: true },
              { name: 'Active Channels', value: `${settings.tempChannels?.length || 0}`, inline: true }
            )
            .setFooter({ text: 'You can use {username}, {game}, and {count} in the name format' })
            .setTimestamp();
          
          return interaction.reply({ embeds: [embed] });
        }
        
        // Save updated settings
        await settings.save();
        
        // Create embed
        const embed = new EmbedBuilder()
          .setTitle('Temporary Voice Channel Settings Updated')
          .setColor('#00FF00')
          .setDescription('The following settings have been updated:')
          .setTimestamp();
        
        // Add fields for updated settings
        if (nameFormat !== null) {
          embed.addFields({ name: 'Name Format', value: `\`${nameFormat}\``, inline: true });
        }
        
        if (userLimit !== null) {
          embed.addFields({ name: 'User Limit', value: userLimit === 0 ? 'Unlimited' : `${userLimit}`, inline: true });
        }
        
        if (privateDefault !== null) {
          embed.addFields({ name: 'Private by Default', value: privateDefault ? 'Yes' : 'No', inline: true });
        }
        
        await interaction.reply({ embeds: [embed] });
      }
      
    } catch (error) {
      logger.error(`Error in tempvc command: ${error}`);
      await interaction.reply({
        content: 'There was an error configuring temporary voice channels!',
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
      
      // Get or create TempVC settings
      let settings = await TempVC.findOne({ guildID: message.guild.id });
      
      if (!settings) {
        settings = new TempVC({
          guildID: message.guild.id
        });
      }
      
      if (subcommand === 'enable') {
        // Parse channel mention
        const channelMention = args[1];
        
        if (!channelMention) {
          return message.reply('Please mention a voice channel for users to join to create their own voice channel!');
        }
        
        // Extract channel ID from mention
        const channelId = channelMention.replace(/[<#>]/g, '');
        const joinChannel = message.guild.channels.cache.get(channelId);
        
        if (!joinChannel || joinChannel.type !== ChannelType.GuildVoice) {
          return message.reply('Please mention a valid voice channel!');
        }
        
        // Parse category mention (optional)
        let category = null;
        if (args[2]) {
          const categoryId = args[2].replace(/[<#>]/g, '');
          category = message.guild.channels.cache.get(categoryId);
          
          if (!category || category.type !== ChannelType.GuildCategory) {
            return message.reply('Please mention a valid category!');
          }
        }
        
        // Check permissions
        if (joinChannel) {
          const permissions = joinChannel.permissionsFor(message.guild.members.me);
          if (!permissions.has(PermissionFlagsBits.Connect) || !permissions.has(PermissionFlagsBits.ViewChannel)) {
            return message.reply(`I don't have permission to connect to or view ${joinChannel}! Please give me the appropriate permissions.`);
          }
        }
        
        if (category) {
          const permissions = category.permissionsFor(message.guild.members.me);
          if (!permissions.has(PermissionFlagsBits.ManageChannels) || !permissions.has(PermissionFlagsBits.ViewChannel)) {
            return message.reply(`I don't have permission to manage channels in ${category}! Please give me the appropriate permissions.`);
          }
        }
        
        // Update settings
        settings.enabled = true;
        settings.joinChannelID = joinChannel.id;
        if (category) settings.categoryID = category.id;
        
        await settings.save();
        
        // Create embed
        const embed = new EmbedBuilder()
          .setTitle('Temporary Voice Channels Enabled')
          .setDescription(`Temporary voice channels have been enabled. Users who join ${joinChannel} will get their own voice channel.`)
          .setColor('#00FF00')
          .addFields(
            { name: 'Join Channel', value: `<#${joinChannel.id}>`, inline: true },
            { name: 'Category', value: category ? `<#${category.id}>` : 'None (using same category as join channel)', inline: true },
            { name: 'Name Format', value: `\`${settings.defaults.nameFormat}\``, inline: true },
            { name: 'User Limit', value: settings.defaults.userLimit === 0 ? 'Unlimited' : `${settings.defaults.userLimit}`, inline: true },
            { name: 'Private by Default', value: settings.defaults.private ? 'Yes' : 'No', inline: true }
          )
          .setFooter({ text: 'Use !tempvc settings to configure channel settings' })
          .setTimestamp();
        
        await message.reply({ embeds: [embed] });
        
      } else if (subcommand === 'disable') {
        // Check if already disabled
        if (!settings.enabled) {
          return message.reply('Temporary voice channels are already disabled!');
        }
        
        // Update settings
        settings.enabled = false;
        await settings.save();
        
        // Delete any active temporary channels
        const activeChannels = settings.tempChannels || [];
        let deletedCount = 0;
        
        for (const tempChannel of activeChannels) {
          try {
            const channel = await message.guild.channels.fetch(tempChannel.channelID).catch(() => null);
            if (channel) {
              await channel.delete('Temporary Voice Channel system disabled');
              deletedCount++;
            }
          } catch (error) {
            logger.error(`Error deleting temporary channel: ${error}`);
          }
        }
        
        // Clear temp channels array
        settings.tempChannels = [];
        await settings.save();
        
        await message.reply(`Temporary voice channels have been disabled. ${deletedCount} active temporary channels have been deleted.`);
        
      } else if (subcommand === 'settings') {
        // Parse settings options
        const options = {};
        let i = 1;
        
        while (i < args.length) {
          const option = args[i].toLowerCase();
          
          switch (option) {
            case 'nameformat':
              // Collect remaining args as name format
              options.nameFormat = args.slice(i + 1).join(' ');
              i = args.length; // Exit the loop
              break;
            case 'userlimit':
              const limit = parseInt(args[i + 1]);
              if (!isNaN(limit) && limit >= 0 && limit <= 99) {
                options.userLimit = limit;
                i += 2;
              } else {
                return message.reply('User limit must be a number between 0 and 99! (0 = unlimited)');
              }
              break;
            case 'private':
              const privateValue = args[i + 1]?.toLowerCase();
              if (['true', 'yes', '1'].includes(privateValue)) {
                options.private = true;
                i += 2;
              } else if (['false', 'no', '0'].includes(privateValue)) {
                options.private = false;
                i += 2;
              } else {
                return message.reply('Private must be either `true` or `false`!');
              }
              break;
            default:
              i++;
              break;
          }
        }
        
        // Check if system is enabled
        if (!settings.enabled) {
          return message.reply('The temporary voice channel system is not enabled! Enable it first with `!tempvc enable`.');
        }
        
        // Update settings if provided
        let updated = false;
        
        if ('nameFormat' in options) {
          settings.defaults.nameFormat = options.nameFormat;
          updated = true;
        }
        
        if ('userLimit' in options) {
          settings.defaults.userLimit = options.userLimit;
          updated = true;
        }
        
        if ('private' in options) {
          settings.defaults.private = options.private;
          updated = true;
        }
        
        if (!updated) {
          // Just show current settings
          const embed = new EmbedBuilder()
            .setTitle('Temporary Voice Channel Settings')
            .setColor('#0099ff')
            .addFields(
              { name: 'Status', value: settings.enabled ? 'Enabled' : 'Disabled', inline: true },
              { name: 'Join Channel', value: settings.joinChannelID ? `<#${settings.joinChannelID}>` : 'Not set', inline: true },
              { name: 'Category', value: settings.categoryID ? `<#${settings.categoryID}>` : 'Using join channel category', inline: true },
              { name: 'Name Format', value: `\`${settings.defaults.nameFormat}\``, inline: true },
              { name: 'User Limit', value: settings.defaults.userLimit === 0 ? 'Unlimited' : `${settings.defaults.userLimit}`, inline: true },
              { name: 'Private by Default', value: settings.defaults.private ? 'Yes' : 'No', inline: true },
              { name: 'Active Channels', value: `${settings.tempChannels?.length || 0}`, inline: true }
            )
            .setFooter({ text: 'You can use {username}, {game}, and {count} in the name format' })
            .setTimestamp();
          
          return message.reply({ embeds: [embed] });
        }
        
        // Save updated settings
        await settings.save();
        
        // Create embed
        const embed = new EmbedBuilder()
          .setTitle('Temporary Voice Channel Settings Updated')
          .setColor('#00FF00')
          .setDescription('The following settings have been updated:')
          .setTimestamp();
        
        // Add fields for updated settings
        if ('nameFormat' in options) {
          embed.addFields({ name: 'Name Format', value: `\`${options.nameFormat}\``, inline: true });
        }
        
        if ('userLimit' in options) {
          embed.addFields({ name: 'User Limit', value: options.userLimit === 0 ? 'Unlimited' : `${options.userLimit}`, inline: true });
        }
        
        if ('private' in options) {
          embed.addFields({ name: 'Private by Default', value: options.private ? 'Yes' : 'No', inline: true });
        }
        
        await message.reply({ embeds: [embed] });
      }
      
    } catch (error) {
      logger.error(`Error in legacy tempvc command: ${error}`);
      message.reply('There was an error configuring temporary voice channels!');
    }
  }
};