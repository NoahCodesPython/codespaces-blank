const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const Application = require('../../models/application/Application');
const Guild = require('../../models/Guild');
const logger = require('../../utils/logger');

module.exports = {
  name: 'applylog',
  description: 'Set the channel for application logs',
  category: 'applications',
  aliases: ['applog', 'applicationlogs', 'applylogs'],
  usage: '<channel | off>',
  examples: ['applylog #applications', 'applylog off'],
  userPermissions: [PermissionFlagsBits.ManageGuild],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('applylog')
    .setDescription('Set the channel for application logs')
    .addChannelOption(option => 
      option.setName('channel')
        .setDescription('The channel to send application logs to')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText))
    .addStringOption(option => 
      option.setName('disable')
        .setDescription('Disable application logs')
        .setRequired(false)
        .addChoices({ name: 'Off', value: 'off' }))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  
  // Slash command execution
  async execute(interaction) {
    try {
      // Get options
      const channel = interaction.options.getChannel('channel');
      const disable = interaction.options.getString('disable');
      
      // Check if either channel or disable is provided
      if (!channel && disable !== 'off') {
        return interaction.reply({ 
          content: 'Please provide either a channel or use the "off" option to disable logs.',
          ephemeral: true
        });
      }
      
      // Get or create application config
      let applicationSettings = await Application.findOne({ guildID: interaction.guild.id });
      
      if (!applicationSettings) {
        applicationSettings = new Application({
          guildID: interaction.guild.id,
          questions: [],
          appToggle: false,
          appLogs: disable === 'off' ? null : (channel ? channel.id : null)
        });
      } else {
        // Update application log channel
        applicationSettings.appLogs = disable === 'off' ? null : (channel ? channel.id : null);
      }
      
      await applicationSettings.save();
      
      // Create response embed
      const embed = new EmbedBuilder()
        .setTitle('Application Settings Updated')
        .setColor('#00FF00')
        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
        .setTimestamp();
      
      if (disable === 'off') {
        embed.setDescription('✅ Application logs have been disabled.');
      } else if (channel) {
        embed.setDescription(`✅ Application logs will now be sent to ${channel}.`);
      }
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing applylog command: ${error}`);
      await interaction.reply({ 
        content: 'There was an error executing this command!', 
        ephemeral: true 
      });
    }
  },
  
  // Legacy command execution
  async run(client, message, args) {
    try {
      // Check if args were provided
      if (!args.length) {
        return message.reply('Please specify a channel or use `off` to disable application logs.');
      }
      
      let logChannelId = null;
      
      if (args[0].toLowerCase() === 'off') {
        // Disable logs
        logChannelId = null;
      } else {
        // Get channel from mention or ID
        const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]);
        
        if (!channel) {
          return message.reply('Please specify a valid channel or use `off` to disable logs.');
        }
        
        if (channel.type !== ChannelType.GuildText) {
          return message.reply('The channel must be a text channel.');
        }
        
        logChannelId = channel.id;
      }
      
      // Get or create application config
      let applicationSettings = await Application.findOne({ guildID: message.guild.id });
      
      if (!applicationSettings) {
        applicationSettings = new Application({
          guildID: message.guild.id,
          questions: [],
          appToggle: false,
          appLogs: logChannelId
        });
      } else {
        // Update application log channel
        applicationSettings.appLogs = logChannelId;
      }
      
      await applicationSettings.save();
      
      // Create response embed
      const embed = new EmbedBuilder()
        .setTitle('Application Settings Updated')
        .setColor('#00FF00')
        .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTimestamp();
      
      if (args[0].toLowerCase() === 'off') {
        embed.setDescription('✅ Application logs have been disabled.');
      } else if (logChannelId) {
        const channelMention = `<#${logChannelId}>`;
        embed.setDescription(`✅ Application logs will now be sent to ${channelMention}.`);
      }
      
      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing applylog command: ${error}`);
      message.reply('There was an error executing this command!');
    }
  }
};