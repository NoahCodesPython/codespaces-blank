const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const fetch = require('node-fetch');
const logger = require('../../utils/logger');

module.exports = {
  name: 'joke',
  description: 'Generate a random joke from jokeAPI',
  category: 'fun',
  cooldown: 3,
  
  // Slash command data
  data: new SlashCommandBuilder()
    .setName('joke')
    .setDescription('Generate a random joke'),
  
  // Execute slash command
  async execute(client, interaction) {
    try {
      const response = await fetch(`https://v2.jokeapi.dev/joke/Programming,Miscellaneous?blacklistFlags=nsfw,religious,political,racist,sexist`);
      
      if (!response.ok) {
        return interaction.reply({ content: 'Sorry, I couldn\'t connect to the Joke API.', ephemeral: true });
      }
      
      const data = await response.json();
      const { type, category, joke, setup, delivery } = data;
      
      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle(`${category} joke`)
        .setDescription(type === 'twopart' ? `${setup}\n\n||${delivery}||` : joke)
        .setFooter({ text: 'Powered by JokeAPI' });
      
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      logger.error(`Error in joke command: ${error}`);
      await interaction.reply({ content: 'There was an error fetching a joke!', ephemeral: true });
    }
  },
  
  // Execute legacy command
  async run(client, message, args) {
    try {
      const response = await fetch(`https://v2.jokeapi.dev/joke/Programming,Miscellaneous?blacklistFlags=nsfw,religious,political,racist,sexist`);
      
      if (!response.ok) {
        return message.channel.send('Sorry, I couldn\'t connect to the Joke API.');
      }
      
      const data = await response.json();
      const { type, category, joke, setup, delivery } = data;
      
      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle(`${category} joke`)
        .setDescription(type === 'twopart' ? `${setup}\n\n||${delivery}||` : joke)
        .setFooter({ text: 'Powered by JokeAPI' });
      
      await message.channel.send({ embeds: [embed] });
    } catch (error) {
      logger.error(`Error in joke command: ${error}`);
      await message.channel.send('There was an error fetching a joke!');
    }
  }
};