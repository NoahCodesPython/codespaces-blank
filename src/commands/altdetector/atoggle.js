const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { AltDetector } = require('../../models/AltDetector');
const Guild = require('../../models/Guild');
const logger = require('../../utils/logger');

module.exports = {
  name: 'atoggle',
  description: 'Toggle the alt detector system on or off',
  category: 'altdetector',
  aliases: ['alttoggle'],
  usage: '<on | off>',
  examples: ['atoggle on', 'atoggle off'],
  userPermissions: [PermissionFlagsBits.ManageGuild],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('atoggle')
    .setDescription('Toggle the alt detector system on or off')
    .addStringOption(option => 
      option.setName('state')
        .setDescription('Enable or disable alt detection')
        .setRequired(true)
        .addChoices(
          { name: 'On', value: 'on' },
          { name: 'Off', value: 'off' }
        ))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  
  // Slash command execution
  async execute(interaction) {
    try {
      // Get option value
      const state = interaction.options.getString('state');
      const enabled = state === 'on';
      
      // Find or create alt detector settings for this guild
      let altSettings = await AltDetector.findOne({ guildID: interaction.guild.id });
      
      if (!altSettings) {
        // Create new settings if none exist
        altSettings = new AltDetector({
          guildID: interaction.guild.id,
          altToggle: enabled
        });
        await altSettings.save();
      } else {
        // Update existing settings
        altSettings.altToggle = enabled;
        await altSettings.save();
      }
      
      // Send success message
      const embed = new EmbedBuilder()
        .setTitle('Alt Detector Settings Updated')
        .setDescription(`✅ Alt detector system has been turned **${enabled ? 'ON' : 'OFF'}**`)
        .setColor(enabled ? '#00FF00' : '#FF0000')
        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing atoggle command: ${error}`);
      await interaction.reply({ 
        content: 'There was an error executing this command!', 
        ephemeral: true 
      });
    }
  },
  
  // Legacy command execution
  async run(client, message, args) {
    try {
      // Check if state was provided
      if (!args[0]) {
        return message.reply('Please specify a state: `on` or `off`.');
      }
      
      // Parse the state argument
      const state = args[0].toLowerCase();
      if (state !== 'on' && state !== 'off') {
        return message.reply('Invalid state. Please use `on` or `off`.');
      }
      
      const enabled = state === 'on';
      
      // Find or create alt detector settings for this guild
      let altSettings = await AltDetector.findOne({ guildID: message.guild.id });
      
      if (!altSettings) {
        // Create new settings if none exist
        altSettings = new AltDetector({
          guildID: message.guild.id,
          altToggle: enabled
        });
        await altSettings.save();
      } else {
        // Update existing settings
        altSettings.altToggle = enabled;
        await altSettings.save();
      }
      
      // Send success message
      const embed = new EmbedBuilder()
        .setTitle('Alt Detector Settings Updated')
        .setDescription(`✅ Alt detector system has been turned **${enabled ? 'ON' : 'OFF'}**`)
        .setColor(enabled ? '#00FF00' : '#FF0000')
        .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTimestamp();
      
      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing atoggle command: ${error}`);
      message.reply('There was an error executing this command!');
    }
  }
};