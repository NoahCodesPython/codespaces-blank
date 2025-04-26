const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const logger = require('../../utils/logger');

module.exports = {
  name: 'say',
  description: 'Make the bot send a message',
  category: 'fun',
  cooldown: 3,

  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Make the bot send a message')
    .addStringOption(option => 
      option.setName('message')
        .setDescription('The message to send')
        .setRequired(true)),

  async execute(client, interaction) {
    try {
      const message = interaction.options.getString('message', true);
      await interaction.channel.send(message);
      await interaction.reply({ content: 'Message sent!', ephemeral: true });

    } catch (error) {
      logger.error(`Error in say command: ${error}`);
      await interaction.reply({ 
        content: 'There was an error executing this command!', 
        ephemeral: true 
      });
    }
  }
};