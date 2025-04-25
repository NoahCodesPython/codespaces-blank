const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Application = require('../../models/application/Application');
const Guild = require('../../models/Guild');
const logger = require('../../utils/logger');

module.exports = {
  name: 'addquestions',
  description: 'Add questions to the application system',
  category: 'applications',
  aliases: ['addq', 'applicationadd'],
  usage: '<question>',
  examples: ['addquestions What skills do you have?'],
  userPermissions: [PermissionFlagsBits.ManageGuild],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('addquestions')
    .setDescription('Add a question to the application system')
    .addStringOption(option => 
      option.setName('question')
        .setDescription('The question to add')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  
  // Slash command execution
  async execute(interaction) {
    try {
      // Get the question
      const question = interaction.options.getString('question');
      
      // Validate question length
      if (question.length > 1000) {
        return interaction.reply({
          content: 'The question cannot be longer than 1000 characters.',
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
          appLogs: null
        });
      }
      
      // Add the question
      applicationSettings.questions.push(question);
      await applicationSettings.save();
      
      // Create response embed
      const embed = new EmbedBuilder()
        .setTitle('Application Question Added')
        .setDescription(`✅ Successfully added the question to the application system.`)
        .addFields({ 
          name: 'Question Added', 
          value: question 
        })
        .addFields({ 
          name: 'Total Questions', 
          value: `${applicationSettings.questions.length}` 
        })
        .setColor('#00FF00')
        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing addquestions command: ${error}`);
      await interaction.reply({ 
        content: 'There was an error executing this command!', 
        ephemeral: true 
      });
    }
  },
  
  // Legacy command execution
  async run(client, message, args) {
    try {
      // Check if question was provided
      if (!args.length) {
        return message.reply('Please provide a question to add.');
      }
      
      // Get the question
      const question = args.join(' ');
      
      // Validate question length
      if (question.length > 1000) {
        return message.reply('The question cannot be longer than 1000 characters.');
      }
      
      // Get or create application config
      let applicationSettings = await Application.findOne({ guildID: message.guild.id });
      
      if (!applicationSettings) {
        applicationSettings = new Application({
          guildID: message.guild.id,
          questions: [],
          appToggle: false,
          appLogs: null
        });
      }
      
      // Add the question
      applicationSettings.questions.push(question);
      await applicationSettings.save();
      
      // Create response embed
      const embed = new EmbedBuilder()
        .setTitle('Application Question Added')
        .setDescription(`✅ Successfully added the question to the application system.`)
        .addFields({ 
          name: 'Question Added', 
          value: question 
        })
        .addFields({ 
          name: 'Total Questions', 
          value: `${applicationSettings.questions.length}` 
        })
        .setColor('#00FF00')
        .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTimestamp();
      
      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing addquestions command: ${error}`);
      message.reply('There was an error executing this command!');
    }
  }
};