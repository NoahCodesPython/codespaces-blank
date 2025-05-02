const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const logger = require('../../utils/logger');

module.exports = {
  name: 'feedback',
  description: 'Send feedback about the bot or suggest new features',
  category: 'utility',
  cooldown: 300, // 5 minute cooldown to prevent spam
  usage: '',
  examples: ['feedback'],
  
  data: new SlashCommandBuilder()
    .setName('feedback')
    .setDescription('Send feedback about the bot or suggest new features')
    .addStringOption(option => 
      option
        .setName('type')
        .setDescription('The type of feedback you want to provide')
        .setRequired(true)
        .addChoices(
          { name: 'Bug Report', value: 'bug' },
          { name: 'Feature Request', value: 'feature' },
          { name: 'General Feedback', value: 'feedback' }
        )
    )
    .addStringOption(option => 
      option
        .setName('content')
        .setDescription('Your feedback message')
        .setRequired(true)
    ),
  
  async execute(interaction) {
    try {
      const feedbackType = interaction.options.getString('type');
      const content = interaction.options.getString('content');
      
      // Create different colored embeds based on feedback type
      const colors = {
        'bug': '#FF0000',      // Red for bugs
        'feature': '#00FF00',  // Green for features
        'feedback': '#0099FF'  // Blue for general feedback
      };
      
      const titles = {
        'bug': '🐛 Bug Report',
        'feature': '✨ Feature Request',
        'feedback': '💬 General Feedback'
      };
      
      // Create the feedback embed
      const feedbackEmbed = new EmbedBuilder()
        .setTitle(titles[feedbackType])
        .setDescription(content)
        .setColor(colors[feedbackType])
        .addFields(
          { name: 'Submitted By', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
          { name: 'From Server', value: interaction.guild ? `${interaction.guild.name} (${interaction.guild.id})` : 'Direct Message', inline: true },
          { name: 'Submitted At', value: new Date().toLocaleString(), inline: true }
        )
        .setFooter({ text: 'Aquire Feedback System' })
        .setTimestamp();
      
      // Send a thank you message to the user
      const thankYouEmbed = new EmbedBuilder()
        .setTitle('Thank You for Your Feedback!')
        .setDescription(`Your ${feedbackType === 'bug' ? 'bug report' : feedbackType === 'feature' ? 'feature request' : 'feedback'} has been submitted to the developers.`)
        .setColor(colors[feedbackType])
        .setFooter({ text: 'Aquire Feedback System' })
        .setTimestamp();
      
      // Add a button for bug reports to create a more detailed report
      if (feedbackType === 'bug') {
        const actionRow = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('detailed_bug_report')
              .setLabel('Submit Detailed Bug Report')
              .setStyle(ButtonStyle.Danger)
              .setEmoji('🔍')
          );
        
        await interaction.reply({
          embeds: [thankYouEmbed],
          components: [actionRow],
          ephemeral: true
        });
      } else {
        await interaction.reply({
          embeds: [thankYouEmbed],
          ephemeral: true
        });
      }
      
      // Try to send the feedback to the bot owner
      try {
        const config = require('../../config');
        const owner = await interaction.client.users.fetch(config.ownerId.startsWith('-') ? config.ownerId.substring(1) : config.ownerId);
        if (owner) {
          await owner.send({ embeds: [feedbackEmbed] });
          logger.info(`Feedback sent to owner: ${config.ownerName}`);
        }
      } catch (dmError) {
        logger.error(`Error sending feedback DM to owner: ${dmError}`);
      }
      
      logger.info(`Feedback received from ${interaction.user.tag} (${interaction.user.id}): ${feedbackType}`);
    } catch (error) {
      logger.error(`Error executing feedback command: ${error}`);
      
      await interaction.reply({
        content: 'There was an error submitting your feedback. Please try again later.',
        ephemeral: true
      });
    }
  }
};