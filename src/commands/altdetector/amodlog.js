const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { AltDetector } = require('../../models/AltDetector');
const Guild = require('../../models/Guild');
const logger = require('../../utils/logger');

module.exports = {
  name: 'amodlog',
  description: 'Set the channel for alt detection logs',
  category: 'altdetector',
  aliases: ['altlog', 'altlogs'],
  usage: '<channel | off>',
  examples: ['amodlog #alt-logs', 'amodlog off'],
  userPermissions: [PermissionFlagsBits.ManageGuild],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('amodlog')
    .setDescription('Set the channel for alt detection logs')
    .addChannelOption(option => 
      option.setName('channel')
        .setDescription('The channel to send alt detection logs to')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText))
    .addStringOption(option => 
      option.setName('disable')
        .setDescription('Disable alt detection logs')
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
      
      // Find or create alt detector settings for this guild
      let altSettings = await AltDetector.findOne({ guildID: interaction.guild.id });
      
      if (!altSettings) {
        // Create new settings if none exist
        altSettings = new AltDetector({
          guildID: interaction.guild.id,
          altModlog: disable === 'off' ? null : channel.id
        });
        await altSettings.save();
      } else {
        // Update existing settings
        altSettings.altModlog = disable === 'off' ? null : (channel ? channel.id : null);
        await altSettings.save();
      }
      
      // Send success message
      const embed = new EmbedBuilder()
        .setTitle('Alt Detector Settings Updated')
        .setColor('#00FF00')
        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
        .setTimestamp();
        
      if (disable === 'off' || !channel) {
        embed.setDescription('✅ Alt detection logs have been disabled.');
      } else {
        embed.setDescription(`✅ Alt detection logs will now be sent to ${channel}`);
      }
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing amodlog command: ${error}`);
      await interaction.reply({ 
        content: 'There was an error executing this command!', 
        ephemeral: true 
      });
    }
  },
  
  // Legacy command execution
  async run(client, message, args) {
    try {
      // Check if a channel was mentioned or 'off' was specified
      if (!args[0]) {
        return message.reply('Please specify a channel or use `off` to disable logs.');
      }
      
      let modLogChannelId = null;
      
      if (args[0].toLowerCase() === 'off') {
        // Disable logs
        modLogChannelId = null;
      } else {
        // Get channel from mention or ID
        const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]);
        
        if (!channel) {
          return message.reply('Please specify a valid channel or use `off` to disable logs.');
        }
        
        if (channel.type !== ChannelType.GuildText) {
          return message.reply('The specified channel must be a text channel.');
        }
        
        modLogChannelId = channel.id;
      }
      
      // Find or create alt detector settings for this guild
      let altSettings = await AltDetector.findOne({ guildID: message.guild.id });
      
      if (!altSettings) {
        // Create new settings if none exist
        altSettings = new AltDetector({
          guildID: message.guild.id,
          altModlog: modLogChannelId
        });
        await altSettings.save();
      } else {
        // Update existing settings
        altSettings.altModlog = modLogChannelId;
        await altSettings.save();
      }
      
      // Send success message
      const embed = new EmbedBuilder()
        .setTitle('Alt Detector Settings Updated')
        .setColor('#00FF00')
        .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTimestamp();
        
      if (args[0].toLowerCase() === 'off' || !modLogChannelId) {
        embed.setDescription('✅ Alt detection logs have been disabled.');
      } else {
        const channelMention = `<#${modLogChannelId}>`;
        embed.setDescription(`✅ Alt detection logs will now be sent to ${channelMention}`);
      }
      
      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing amodlog command: ${error}`);
      message.reply('There was an error executing this command!');
    }
  }
};