const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { AltDetector } = require('../../models/AltDetector');
const Guild = require('../../models/Guild');
const logger = require('../../utils/logger');

module.exports = {
  name: 'asetdays',
  description: 'Set minimum account age to avoid being flagged as an alt',
  category: 'altdetector',
  aliases: ['altdays', 'amindays'],
  usage: '<days>',
  examples: ['asetdays 7', 'asetdays 14'],
  userPermissions: [PermissionFlagsBits.ManageGuild],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('asetdays')
    .setDescription('Set minimum account age to avoid being flagged as an alt')
    .addIntegerOption(option => 
      option.setName('days')
        .setDescription('Minimum account age in days')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(365))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  
  // Slash command execution
  async execute(interaction) {
    try {
      // Get option value
      const days = interaction.options.getInteger('days');
      
      // Validate the days value
      if (days < 1) {
        return interaction.reply({ 
          content: 'The minimum account age must be at least 1 day.',
          ephemeral: true
        });
      }
      
      // Find or create alt detector settings for this guild
      let altSettings = await AltDetector.findOne({ guildID: interaction.guild.id });
      
      if (!altSettings) {
        // Create new settings if none exist
        altSettings = new AltDetector({
          guildID: interaction.guild.id,
          altDays: days.toString()
        });
        await altSettings.save();
      } else {
        // Update existing settings
        altSettings.altDays = days.toString();
        await altSettings.save();
      }
      
      // Send success message
      const embed = new EmbedBuilder()
        .setTitle('Alt Detector Settings Updated')
        .setDescription(`✅ Successfully set the minimum account age to **${days} days**`)
        .setColor('#00FF00')
        .addFields([
          { name: 'What This Means', value: `Users with accounts younger than ${days} days will be flagged as potential alts.` }
        ])
        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing asetdays command: ${error}`);
      await interaction.reply({ 
        content: 'There was an error executing this command!', 
        ephemeral: true 
      });
    }
  },
  
  // Legacy command execution
  async run(client, message, args) {
    try {
      // Check if days were provided
      if (!args[0]) {
        return message.reply('Please specify the minimum account age in days.');
      }
      
      // Parse the days argument
      const days = parseInt(args[0]);
      if (isNaN(days) || days < 1) {
        return message.reply('Please provide a valid number of days (minimum 1).');
      }
      
      // Find or create alt detector settings for this guild
      let altSettings = await AltDetector.findOne({ guildID: message.guild.id });
      
      if (!altSettings) {
        // Create new settings if none exist
        altSettings = new AltDetector({
          guildID: message.guild.id,
          altDays: days.toString()
        });
        await altSettings.save();
      } else {
        // Update existing settings
        altSettings.altDays = days.toString();
        await altSettings.save();
      }
      
      // Send success message
      const embed = new EmbedBuilder()
        .setTitle('Alt Detector Settings Updated')
        .setDescription(`✅ Successfully set the minimum account age to **${days} days**`)
        .setColor('#00FF00')
        .addFields([
          { name: 'What This Means', value: `Users with accounts younger than ${days} days will be flagged as potential alts.` }
        ])
        .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTimestamp();
      
      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing asetdays command: ${error}`);
      message.reply('There was an error executing this command!');
    }
  }
};