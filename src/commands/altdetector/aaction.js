const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { AltDetector } = require('../../models/AltDetector');
const Guild = require('../../models/Guild');
const logger = require('../../utils/logger');

module.exports = {
  name: 'aaction',
  description: 'Set the action taken when an alt account is detected',
  category: 'altdetector',
  aliases: ['altaction'],
  usage: '<ban | kick | none>',
  examples: ['aaction kick', 'aaction ban', 'aaction none'],
  userPermissions: [PermissionFlagsBits.ManageGuild],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('aaction')
    .setDescription('Set the action taken when an alt account is detected')
    .addStringOption(option => 
      option.setName('action')
        .setDescription('The action to take on detected alt accounts')
        .setRequired(true)
        .addChoices(
          { name: 'Ban', value: 'ban' },
          { name: 'Kick', value: 'kick' },
          { name: 'None', value: 'none' }
        ))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  
  // Slash command execution
  async execute(interaction) {
    try {
      // Get the selected action
      const action = interaction.options.getString('action');
      
      // Find or create alt detector settings for this guild
      let altSettings = await AltDetector.findOne({ guildID: interaction.guild.id });
      
      if (!altSettings) {
        // Create new settings if none exist
        altSettings = new AltDetector({
          guildID: interaction.guild.id,
          altAction: action
        });
        await altSettings.save();
      } else {
        // Update existing settings
        altSettings.altAction = action;
        await altSettings.save();
      }
      
      // Send success message
      const embed = new EmbedBuilder()
        .setTitle('Alt Detector Settings Updated')
        .setDescription(`✅ Successfully set the alt account action to: **${action}**`)
        .setColor('#00FF00')
        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing aaction command: ${error}`);
      await interaction.reply({ 
        content: 'There was an error executing this command!', 
        ephemeral: true 
      });
    }
  },
  
  // Legacy command execution
  async run(client, message, args) {
    try {
      // Check if an action was provided
      if (!args[0]) {
        return message.reply('Please specify an action: `ban`, `kick`, or `none`.');
      }
      
      // Validate the action
      const validActions = ['ban', 'kick', 'none'];
      const action = args[0].toLowerCase();
      
      if (!validActions.includes(action)) {
        return message.reply(`Invalid action. Please choose from: ${validActions.join(', ')}`);
      }
      
      // Find or create alt detector settings for this guild
      let altSettings = await AltDetector.findOne({ guildID: message.guild.id });
      
      if (!altSettings) {
        // Create new settings if none exist
        altSettings = new AltDetector({
          guildID: message.guild.id,
          altAction: action
        });
        await altSettings.save();
      } else {
        // Update existing settings
        altSettings.altAction = action;
        await altSettings.save();
      }
      
      // Send success message
      const embed = new EmbedBuilder()
        .setTitle('Alt Detector Settings Updated')
        .setDescription(`✅ Successfully set the alt account action to: **${action}**`)
        .setColor('#00FF00')
        .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTimestamp();
      
      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing aaction command: ${error}`);
      message.reply('There was an error executing this command!');
    }
  }
};