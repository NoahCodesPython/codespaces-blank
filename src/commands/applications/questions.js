const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Application = require('../../models/application/Application');
const Guild = require('../../models/Guild');
const logger = require('../../utils/logger');

module.exports = {
  name: 'questions',
  description: 'View all application questions',
  category: 'applications',
  aliases: ['listquestions', 'applicationquestions', 'appquestions'],
  usage: '',
  examples: ['questions'],
  userPermissions: [PermissionFlagsBits.ManageGuild],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('questions')
    .setDescription('View all application questions')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  
  // Slash command execution
  async execute(interaction) {
    try {
      // Get application config
      let applicationSettings = await Application.findOne({ guildID: interaction.guild.id });
      
      // Check if application settings exist
      if (!applicationSettings || !applicationSettings.questions.length) {
        return interaction.reply({
          content: 'There are no application questions set up for this server.',
          ephemeral: true
        });
      }
      
      // Format questions
      let questionsText = '';
      applicationSettings.questions.forEach((question, index) => {
        questionsText += `**${index + 1}.** ${question}\n\n`;
      });
      
      // Create response embed
      const embed = new EmbedBuilder()
        .setTitle('Application Questions')
        .setDescription(questionsText || 'No questions found.')
        .setColor('#3498db')
        .addFields({
          name: 'Total Questions',
          value: `${applicationSettings.questions.length}`
        })
        .addFields({
          name: 'Application Status',
          value: applicationSettings.appToggle ? '✅ Enabled' : '❌ Disabled'
        })
        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
        .setTimestamp();
      
      // Add log channel info if set
      if (applicationSettings.appLogs) {
        const channel = interaction.guild.channels.cache.get(applicationSettings.appLogs);
        embed.addFields({
          name: 'Log Channel',
          value: channel ? `<#${channel.id}>` : 'Invalid channel'
        });
      }
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing questions command: ${error}`);
      await interaction.reply({ 
        content: 'There was an error executing this command!', 
        ephemeral: true 
      });
    }
  },
  
  // Legacy command execution
  async run(client, message, args) {
    try {      
      // Get application config
      let applicationSettings = await Application.findOne({ guildID: message.guild.id });
      
      // Check if application settings exist
      if (!applicationSettings || !applicationSettings.questions.length) {
        return message.reply('There are no application questions set up for this server.');
      }
      
      // Format questions
      let questionsText = '';
      applicationSettings.questions.forEach((question, index) => {
        questionsText += `**${index + 1}.** ${question}\n\n`;
      });
      
      // Create response embed
      const embed = new EmbedBuilder()
        .setTitle('Application Questions')
        .setDescription(questionsText || 'No questions found.')
        .setColor('#3498db')
        .addFields({
          name: 'Total Questions',
          value: `${applicationSettings.questions.length}`
        })
        .addFields({
          name: 'Application Status',
          value: applicationSettings.appToggle ? '✅ Enabled' : '❌ Disabled'
        })
        .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTimestamp();
      
      // Add log channel info if set
      if (applicationSettings.appLogs) {
        const channel = message.guild.channels.cache.get(applicationSettings.appLogs);
        embed.addFields({
          name: 'Log Channel',
          value: channel ? `<#${channel.id}>` : 'Invalid channel'
        });
      }
      
      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing questions command: ${error}`);
      message.reply('There was an error executing this command!');
    }
  }
};