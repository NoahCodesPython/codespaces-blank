const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { v4: uuidv4 } = require('uuid');
const Application = require('../../models/application/Application');
const AppID = require('../../models/application/AppID');
const Applied = require('../../models/application/Applied');
const logger = require('../../utils/logger');

module.exports = {
  name: 'apply',
  description: 'Apply for a position',
  category: 'applications',
  aliases: ['application', 'applyform'],
  usage: '',
  examples: ['apply'],
  userPermissions: [],
  botPermissions: [],

  data: new SlashCommandBuilder()
    .setName('apply')
    .setDescription('Apply for a position'),

  // Slash command execution
  async execute(interaction) {
    try {
      // Get application config
      const applicationSettings = await Application.findOne({ guildID: interaction.guild.id });

      // Check if application system is enabled  
      if (!applicationSettings || !applicationSettings.appToggle) {
        return interaction.reply({
          content: 'The application system is not enabled on this server.',
          ephemeral: true
        });
      }

      // Check if there are any questions  
      if (!applicationSettings.questions.length) {
        return interaction.reply({
          content: 'There are no application questions set up. Please contact a server administrator.',
          ephemeral: true
        });
      }

      // Check if user has already applied  
      const hasApplied = await Applied.findOne({
        guildID: interaction.guild.id,
        userID: interaction.user.id,
        hasApplied: true
      });

      if (hasApplied) {
        return interaction.reply({
          content: 'You have already submitted an application. Please wait for staff to review it.',
          ephemeral: true
        });
      }

      // Create a unique application ID  
      const applicationId = uuidv4();

      // Create modal with limited questions  
      // Discord only supports up to 5 text inputs per modal  
      const modal = new ModalBuilder()
        .setCustomId(`application_${applicationId}`)
        .setTitle('Position Application');

      // Add questions (maximum of 5 due to Discord limitations)  
      const questions = applicationSettings.questions.slice(0, 5);

      const components = questions.map((question, index) => {
        const textInput = new TextInputBuilder()
          .setCustomId(`question_${index}`)
          .setLabel(question.length > 45 ? question.substring(0, 42) + '...' : question)
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(1000);

        return new ActionRowBuilder().addComponents(textInput);
      });

      // Add components to modal  
      modal.addComponents(...components);

      // Store application ID  
      await AppID.create({
        guildID: interaction.guild.id,
        userID: interaction.user.id,
        appID: applicationId
      });

      // Show modal to user  
      await interaction.showModal(modal);

    } catch (error) {
      logger.error(`Error executing apply command: ${error}`);
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
      const applicationSettings = await Application.findOne({ guildID: message.guild.id });

      // Check if application system is enabled  
      if (!applicationSettings || !applicationSettings.appToggle) {
        return message.reply('The application system is not enabled on this server.');
      }

      // Check if there are any questions  
      if (!applicationSettings.questions.length) {
        return message.reply('There are no application questions set up. Please contact a server administrator.');
      }

      // Check if user has already applied  
      const hasApplied = await Applied.findOne({
        guildID: message.guild.id,
        userID: message.author.id,
        hasApplied: true
      });

      if (hasApplied) {
        return message.reply('You have already submitted an application. Please wait for staff to review it.');
      }

      // Create a unique application ID  
      const applicationId = uuidv4();

      // Store application ID  
      await AppID.create({
        guildID: message.guild.id,
        userID: message.author.id,
        appID: applicationId
      });

      // Create an embed with information  
      const embed = new EmbedBuilder()
        .setTitle('Application Process Started')
        .setDescription('I will send you a DM to start the application process. Please make sure your DMs are open.')
        .setColor('#3498db')
        .setFooter({ text: 'Application ID: ' + applicationId })
        .setTimestamp();

      await message.reply({ embeds: [embed] });

      // Start the application process via DM  
      try {
        // Create initial DM to user  
        const dmEmbed = new EmbedBuilder()
          .setTitle(`Application for ${message.guild.name}`)
          .setDescription('Please answer the following questions. You can type `cancel` at any time to cancel the application.')
          .setColor('#3498db')
          .setFooter({ text: 'Application ID: ' + applicationId })
          .setTimestamp();

        const dmChannel = await message.author.createDM();
        await dmChannel.send({ embeds: [dmEmbed] });

        // Create collector for responses  
        const filter = m => m.author.id === message.author.id;
        const answers = [];

        // Function to process questions sequentially  
        const askQuestion = async (index) => {
          if (index >= applicationSettings.questions.length) {
            // All questions answered  
            await processAnswers(message, applicationSettings, applicationId, answers);
            return;
          }

          // Send question  
          await dmChannel.send(`**Question ${index + 1}:** ${applicationSettings.questions[index]}`);

          try {
            // Wait for response  
            const collected = await dmChannel.awaitMessages({
              filter,
              max: 1,
              time: 300000,
              errors: ['time']
            });

            const response = collected.first().content;

            // Check for cancel  
            if (response.toLowerCase() === 'cancel') {
              await dmChannel.send('Application process has been cancelled.');

              // Clean up  
              await AppID.findOneAndDelete({
                guildID: message.guild.id,
                userID: message.author.id,
                appID: applicationId
              });

              return;
            }

            // Add answer and ask next question  
            answers.push(response);
            await askQuestion(index + 1);

          } catch (error) {
            // Timeout  
            await dmChannel.send('Application process timed out due to inactivity.');

            // Clean up  
            await AppID.findOneAndDelete({
              guildID: message.guild.id,
              userID: message.author.id,
              appID: applicationId
            });
          }
        };

        // Start asking questions  
        await askQuestion(0);

      } catch (error) {
        // Couldn't DM the user  
        if (error.code === 50007) {
          await message.reply('I couldn\'t send you a DM. Please enable direct messages from server members and try again.');
        } else {
          logger.error(`Error in apply command DM process: ${error}`);
          await message.reply('An error occurred while starting the application process.');
        }

        // Clean up  
        await AppID.findOneAndDelete({
          guildID: message.guild.id,
          userID: message.author.id,
          appID: applicationId
        });
      }

    } catch (error) {
      logger.error(`Error executing apply command: ${error}`);
      message.reply('There was an error executing this command!');
    }
  }
};

// Helper function to process answers for legacy command
async function processAnswers(message, applicationSettings, applicationId, answers) {
  try {
    // Create a record that user has applied  
    await Applied.create({
      guildID: message.guild.id,
      userID: message.author.id,
      appID: [applicationId],
      hasApplied: true
    });

    // Create application embed for logs  
    const logEmbed = new EmbedBuilder()
      .setTitle(`New Application from ${message.author.tag}`)
      .setDescription(`Application ID: \`${applicationId}\`\nUser: <@${message.author.id}> (${message.author.id})`)
      .setColor('#3498db')
      .setTimestamp()
      .setThumbnail(message.author.displayAvatarURL({ dynamic: true }));

    // Add questions and answers  
    for (let i = 0; i < applicationSettings.questions.length; i++) {
      logEmbed.addFields({
        name: `Question ${i + 1}: ${applicationSettings.questions[i]}`,
        value: answers[i] || 'No answer provided'
      });
    }

    // Send to logs channel  
    if (applicationSettings.appLogs) {
      const logsChannel = message.guild.channels.cache.get(applicationSettings.appLogs);

      if (logsChannel) {
        // Create buttons for approve/decline  
        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`app_approve_${applicationId}`)
              .setLabel('Approve')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId(`app_decline_${applicationId}`)
              .setLabel('Decline')
              .setStyle(ButtonStyle.Danger)
          );

        await logsChannel.send({ embeds: [logEmbed], components: [row] });
      }
    }

    // Send confirmation to user  
    const dmChannel = await message.author.createDM();
    await dmChannel.send('Thank you for submitting your application! Staff will review it shortly.');

  } catch (error) {
    logger.error(`Error processing application answers: ${error}`);
    // Try to notify user  
    try {
      const dmChannel = await message.author.createDM();
      await dmChannel.send('There was an error processing your application. Please try again later or contact a server administrator.');
    } catch (dmError) {
      logger.error(`Error sending DM after application error: ${dmError}`);
    }
  }
}