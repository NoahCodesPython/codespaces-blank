const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Application = require('../../models/application/Application');
const Guild = require('../../models/Guild');
const logger = require('../../utils/logger');

module.exports = {
  name: 'remquestions',
  description: 'Remove a question from the application system',
  category: 'applications',
  aliases: ['remq', 'removequestion', 'applicationremove'],
  usage: '<question number>',
  examples: ['remquestions 2'],
  userPermissions: [PermissionFlagsBits.ManageGuild],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('remquestions')
    .setDescription('Remove a question from the application system')
    .addIntegerOption(option => 
      option.setName('number')
        .setDescription('The question number to remove')
        .setRequired(true)
        .setMinValue(1))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  
  // Slash command execution
  async execute(interaction) {
    try {
      // Get the question number
      const questionNumber = interaction.options.getInteger('number');
      
      // Get application config
      let applicationSettings = await Application.findOne({ guildID: interaction.guild.id });
      
      // Check if application settings exist
      if (!applicationSettings || !applicationSettings.questions.length) {
        return interaction.reply({
          content: 'There are no application questions set up for this server.',
          ephemeral: true
        });
      }
      
      // Check if the question number is valid
      if (questionNumber > applicationSettings.questions.length) {
        return interaction.reply({
          content: `Invalid question number. There are only ${applicationSettings.questions.length} questions.`,
          ephemeral: true
        });
      }
      
      // Get the question that will be removed
      const removedQuestion = applicationSettings.questions[questionNumber - 1];
      
      // Remove the question
      applicationSettings.questions.splice(questionNumber - 1, 1);
      await applicationSettings.save();
      
      // Create response embed
      const embed = new EmbedBuilder()
        .setTitle('Application Question Removed')
        .setDescription(`✅ Successfully removed question #${questionNumber} from the application system.`)
        .addFields({ 
          name: 'Removed Question', 
          value: removedQuestion || 'Unknown question' 
        })
        .addFields({ 
          name: 'Remaining Questions', 
          value: applicationSettings.questions.length ? `${applicationSettings.questions.length}` : 'None' 
        })
        .setColor('#FF0000')
        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing remquestions command: ${error}`);
      await interaction.reply({ 
        content: 'There was an error executing this command!', 
        ephemeral: true 
      });
    }
  },
  
  // Legacy command execution
  async run(client, message, args) {
    try {
      // Check if question number was provided
      if (!args.length) {
        return message.reply('Please provide a question number to remove.');
      }
      
      // Parse the question number
      const questionNumber = parseInt(args[0]);
      
      if (isNaN(questionNumber) || questionNumber < 1) {
        return message.reply('Please provide a valid question number (must be at least 1).');
      }
      
      // Get application config
      let applicationSettings = await Application.findOne({ guildID: message.guild.id });
      
      // Check if application settings exist
      if (!applicationSettings || !applicationSettings.questions.length) {
        return message.reply('There are no application questions set up for this server.');
      }
      
      // Check if the question number is valid
      if (questionNumber > applicationSettings.questions.length) {
        return message.reply(`Invalid question number. There are only ${applicationSettings.questions.length} questions.`);
      }
      
      // Get the question that will be removed
      const removedQuestion = applicationSettings.questions[questionNumber - 1];
      
      // Remove the question
      applicationSettings.questions.splice(questionNumber - 1, 1);
      await applicationSettings.save();
      
      // Create response embed
      const embed = new EmbedBuilder()
        .setTitle('Application Question Removed')
        .setDescription(`✅ Successfully removed question #${questionNumber} from the application system.`)
        .addFields({ 
          name: 'Removed Question', 
          value: removedQuestion || 'Unknown question' 
        })
        .addFields({ 
          name: 'Remaining Questions', 
          value: applicationSettings.questions.length ? `${applicationSettings.questions.length}` : 'None' 
        })
        .setColor('#FF0000')
        .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTimestamp();
      
      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing remquestions command: ${error}`);
      message.reply('There was an error executing this command!');
    }
  }
};