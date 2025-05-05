const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('entrypoint')
    .setDescription('The main entry point command for the bot'),

  async execute(interaction) {
    await interaction.reply('Welcome to the bot! Use /help to see all available commands.');
  },
};