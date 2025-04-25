const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Application = require('../../models/application/Application');
const Guild = require('../../models/Guild');
const logger = require('../../utils/logger');

module.exports = {
  name: 'toggleapply',
  description: 'Toggle the application system on or off',
  category: 'applications',
  aliases: ['apptoggle', 'applicationtoggle'],
  usage: '<on | off>',
  examples: ['toggleapply on', 'toggleapply off'],
  userPermissions: [PermissionFlagsBits.ManageGuild],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('toggleapply')
    .setDescription('Toggle the application system on or off')
    .addStringOption(option => 
      option.setName('state')
        .setDescription('Enable or disable applications')
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
      
      // Get or create application config
      let applicationSettings = await Application.findOne({ guildID: interaction.guild.id });
      
      if (!applicationSettings) {
        applicationSettings = new Application({
          guildID: interaction.guild.id,
          questions: [],
          appToggle: enabled,
          appLogs: null
        });
      } else {
        // Update toggle state
        applicationSettings.appToggle = enabled;
      }
      
      // If enabled, check if log channel and questions are set
      if (enabled) {
        if (!applicationSettings.appLogs) {
          await applicationSettings.save();
          return interaction.reply({
            content: '⚠️ Application system has been enabled, but no log channel is set. Use `/applylog` to set a log channel.',
            ephemeral: true
          });
        }
        
        if (!applicationSettings.questions.length) {
          await applicationSettings.save();
          return interaction.reply({
            content: '⚠️ Application system has been enabled, but no questions are set. Use `/addquestions` to add application questions.',
            ephemeral: true
          });
        }
      }
      
      await applicationSettings.save();
      
      // Create response embed
      const embed = new EmbedBuilder()
        .setTitle('Application System Settings')
        .setDescription(`✅ Application system has been turned **${enabled ? 'ON' : 'OFF'}**`)
        .setColor(enabled ? '#00FF00' : '#FF0000')
        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing toggleapply command: ${error}`);
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
      
      // Get or create application config
      let applicationSettings = await Application.findOne({ guildID: message.guild.id });
      
      if (!applicationSettings) {
        applicationSettings = new Application({
          guildID: message.guild.id,
          questions: [],
          appToggle: enabled,
          appLogs: null
        });
      } else {
        // Update toggle state
        applicationSettings.appToggle = enabled;
      }
      
      // If enabled, check if log channel and questions are set
      if (enabled) {
        if (!applicationSettings.appLogs) {
          await applicationSettings.save();
          return message.reply('⚠️ Application system has been enabled, but no log channel is set. Use the `applylog` command to set a log channel.');
        }
        
        if (!applicationSettings.questions.length) {
          await applicationSettings.save();
          return message.reply('⚠️ Application system has been enabled, but no questions are set. Use the `addquestions` command to add application questions.');
        }
      }
      
      await applicationSettings.save();
      
      // Create response embed
      const embed = new EmbedBuilder()
        .setTitle('Application System Settings')
        .setDescription(`✅ Application system has been turned **${enabled ? 'ON' : 'OFF'}**`)
        .setColor(enabled ? '#00FF00' : '#FF0000')
        .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTimestamp();
      
      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing toggleapply command: ${error}`);
      message.reply('There was an error executing this command!');
    }
  }
};