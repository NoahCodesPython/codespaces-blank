const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../../utils/logger');
const axios = require('axios');

module.exports = {
  name: 'joke',
  description: 'Get a random joke',
  category: 'fun',
  aliases: ['randomjoke', 'telljoke'],
  usage: '',
  examples: ['joke'],
  userPermissions: [],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('joke')
    .setDescription('Get a random joke')
    .addStringOption(option => 
      option.setName('category')
        .setDescription('Choose a specific joke category')
        .setRequired(false)
        .addChoices(
          { name: 'Programming', value: 'Programming' },
          { name: 'Miscellaneous', value: 'Miscellaneous' },
          { name: 'Dark', value: 'Dark' },
          { name: 'Pun', value: 'Pun' },
          { name: 'Spooky', value: 'Spooky' },
          { name: 'Christmas', value: 'Christmas' }
        )),
  
  // Slash command execution
  async execute(interaction) {
    try {
      // Defer the reply to give time to fetch the joke
      await interaction.deferReply();
      
      // Get joke category if provided
      const category = interaction.options.getString('category');
      
      // API URL
      let url = 'https://v2.jokeapi.dev/joke/Any';
      if (category) {
        url = `https://v2.jokeapi.dev/joke/${category}`;
      }
      
      // Add parameters to exclude NSFW jokes
      url += '?blacklistFlags=nsfw,religious,political,racist,sexist,explicit';
      
      // Fetch joke
      const response = await axios.get(url);
      
      if (!response.data || response.data.error) {
        return interaction.editReply('Failed to fetch a joke. Please try again later.');
      }
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle('😂 Random Joke')
        .setColor('#FFA500') // Orange color
        .setFooter({ text: `Category: ${response.data.category}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      
      // Format joke depending on type
      if (response.data.type === 'single') {
        embed.setDescription(response.data.joke);
      } else {
        embed.setDescription(`**${response.data.setup}**\n\n||${response.data.delivery}||`);
      }
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing joke command: ${error}`);
      
      // If already deferred, edit the reply
      if (interaction.deferred) {
        await interaction.editReply({ 
          content: 'There was an error fetching a joke!', 
        });
      } else {
        await interaction.reply({ 
          content: 'There was an error executing this command!', 
          ephemeral: true 
        });
      }
    }
  },
  
  // Legacy command execution
  async run(client, message, args) {
    try {
      // Send loading message
      const loadingMessage = await message.reply('Fetching a joke...');
      
      // Get joke category if provided
      const category = args[0];
      
      // API URL
      let url = 'https://v2.jokeapi.dev/joke/Any';
      if (category) {
        // Only use if it's a valid category
        const validCategories = ['Programming', 'Miscellaneous', 'Dark', 'Pun', 'Spooky', 'Christmas'];
        const matchedCategory = validCategories.find(c => c.toLowerCase() === category.toLowerCase());
        
        if (matchedCategory) {
          url = `https://v2.jokeapi.dev/joke/${matchedCategory}`;
        }
      }
      
      // Add parameters to exclude NSFW jokes
      url += '?blacklistFlags=nsfw,religious,political,racist,sexist,explicit';
      
      // Fetch joke
      const response = await axios.get(url);
      
      if (!response.data || response.data.error) {
        return loadingMessage.edit('Failed to fetch a joke. Please try again later.');
      }
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle('😂 Random Joke')
        .setColor('#FFA500') // Orange color
        .setFooter({ text: `Category: ${response.data.category}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      
      // Format joke depending on type
      if (response.data.type === 'single') {
        embed.setDescription(response.data.joke);
      } else {
        embed.setDescription(`**${response.data.setup}**\n\n||${response.data.delivery}||`);
      }
      
      await loadingMessage.edit({ content: null, embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing joke command: ${error}`);
      message.reply('There was an error fetching a joke!');
    }
  }
};