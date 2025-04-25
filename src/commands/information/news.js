const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const axios = require('axios');
const logger = require('../../utils/logger');

module.exports = {
  name: 'news',
  description: 'Display the latest news headlines',
  category: 'information',
  aliases: ['headlines', 'worldnews'],
  usage: '[topic]',
  examples: ['news', 'news technology', 'news sports'],
  userPermissions: [],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('news')
    .setDescription('Display the latest news headlines')
    .addStringOption(option => 
      option.setName('topic')
        .setDescription('The topic to search news for')
        .setRequired(false)
        .addChoices(
          { name: 'General', value: 'general' },
          { name: 'Business', value: 'business' },
          { name: 'Technology', value: 'technology' },
          { name: 'Entertainment', value: 'entertainment' },
          { name: 'Health', value: 'health' },
          { name: 'Science', value: 'science' },
          { name: 'Sports', value: 'sports' }
        )),
  
  // Slash command execution
  async execute(interaction) {
    try {
      await interaction.deferReply();
      
      // Get topic from options
      const topic = interaction.options.getString('topic') || 'general';
      
      // Get API key from environment variables
      const apiKey = process.env.NEWS_API_KEY;
      
      if (!apiKey) {
        return interaction.editReply('The bot owner has not set up a NewsAPI key yet. This command is currently unavailable.');
      }
      
      // Fetch news from API
      const news = await fetchNews(topic, apiKey);
      
      if (!news || news.length === 0) {
        return interaction.editReply('Could not find any news articles. Please try again later.');
      }
      
      // Display the first article
      let currentIndex = 0;
      await displayArticle(interaction, news, currentIndex, topic);
      
    } catch (error) {
      logger.error(`Error executing news command: ${error}`);
      
      const errorMessage = error.response?.status === 429 ? 
        'We have reached the rate limit for news requests. Please try again later.' : 
        'There was an error fetching news articles. Please try again later.';
      
      if (interaction.deferred) {
        await interaction.editReply(errorMessage);
      } else {
        await interaction.reply({
          content: errorMessage,
          ephemeral: true
        });
      }
    }
  },
  
  // Legacy command execution
  async run(client, message, args) {
    try {
      const loadingMessage = await message.reply('Fetching the latest news...');
      
      // Get topic from arguments
      let topic = 'general';
      if (args.length > 0) {
        const topicArg = args[0].toLowerCase();
        const validTopics = ['general', 'business', 'technology', 'entertainment', 'health', 'science', 'sports'];
        
        if (validTopics.includes(topicArg)) {
          topic = topicArg;
        }
      }
      
      // Get API key from environment variables
      const apiKey = process.env.NEWS_API_KEY;
      
      if (!apiKey) {
        return loadingMessage.edit('The bot owner has not set up a NewsAPI key yet. This command is currently unavailable.');
      }
      
      // Fetch news from API
      const news = await fetchNews(topic, apiKey);
      
      if (!news || news.length === 0) {
        return loadingMessage.edit('Could not find any news articles. Please try again later.');
      }
      
      // Display the first article
      let currentIndex = 0;
      await displayArticleLegacy(message, loadingMessage, news, currentIndex, topic);
      
    } catch (error) {
      logger.error(`Error executing news command: ${error}`);
      
      const errorMessage = error.response?.status === 429 ? 
        'We have reached the rate limit for news requests. Please try again later.' : 
        'There was an error fetching news articles. Please try again later.';
      
      message.reply(errorMessage);
    }
  }
};

// Helper function to fetch news from the API
async function fetchNews(topic, apiKey) {
  try {
    const response = await axios.get('https://newsapi.org/v2/top-headlines', {
      params: {
        category: topic,
        language: 'en',
        pageSize: 10,
        apiKey: apiKey
      }
    });
    
    return response.data.articles;
  } catch (error) {
    logger.error(`Error fetching news: ${error}`);
    throw error;
  }
}

// Helper function to display an article (for slash commands)
async function displayArticle(interaction, articles, index, topic) {
  const article = articles[index];
  
  if (!article) {
    return interaction.editReply('Could not find any news articles. Please try again later.');
  }
  
  // Format the publication date
  const pubDate = article.publishedAt ? new Date(article.publishedAt) : new Date();
  const timestamp = Math.floor(pubDate.getTime() / 1000);
  
  // Create embed for the article
  const embed = new EmbedBuilder()
    .setTitle(article.title || 'No Title')
    .setURL(article.url || 'https://newsapi.org')
    .setDescription(article.description || 'No description available.')
    .setColor('#3498db')
    .setImage(article.urlToImage || null)
    .addFields(
      { name: 'Source', value: article.source.name || 'Unknown', inline: true },
      { name: 'Published', value: `<t:${timestamp}:R>`, inline: true },
      { name: 'Category', value: topic.charAt(0).toUpperCase() + topic.slice(1), inline: true }
    )
    .setFooter({ 
      text: `Article ${index + 1}/${articles.length} • Powered by NewsAPI.org`,
      iconURL: interaction.user.displayAvatarURL({ dynamic: true })
    })
    .setTimestamp();
  
  // Create navigation buttons
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`news_prev_${interaction.id}`)
        .setLabel('Previous')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(index === 0),
      new ButtonBuilder()
        .setCustomId(`news_next_${interaction.id}`)
        .setLabel('Next')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(index === articles.length - 1),
      new ButtonBuilder()
        .setLabel('Read More')
        .setStyle(ButtonStyle.Link)
        .setURL(article.url || 'https://newsapi.org')
    );
  
  const message = await interaction.editReply({ embeds: [embed], components: [row] });
  
  // Create collector for button interactions
  const filter = i => {
    return i.customId.startsWith('news_') && 
           i.customId.endsWith(interaction.id) && 
           i.user.id === interaction.user.id;
  };
  
  const collector = message.createMessageComponentCollector({ filter, time: 60000 });
  
  collector.on('collect', async i => {
    if (i.customId === `news_prev_${interaction.id}`) {
      await i.deferUpdate();
      const newIndex = index - 1;
      await displayArticle(interaction, articles, newIndex, topic);
      collector.stop();
    } else if (i.customId === `news_next_${interaction.id}`) {
      await i.deferUpdate();
      const newIndex = index + 1;
      await displayArticle(interaction, articles, newIndex, topic);
      collector.stop();
    }
  });
  
  collector.on('end', async (collected, reason) => {
    if (reason === 'time' && message.editable) {
      // Disable buttons when collector expires
      const disabledRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`news_prev_${interaction.id}`)
            .setLabel('Previous')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId(`news_next_${interaction.id}`)
            .setLabel('Next')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true),
          new ButtonBuilder()
            .setLabel('Read More')
            .setStyle(ButtonStyle.Link)
            .setURL(article.url || 'https://newsapi.org')
        );
      
      await interaction.editReply({ embeds: [embed], components: [disabledRow] }).catch(() => {});
    }
  });
}

// Helper function to display an article (for legacy commands)
async function displayArticleLegacy(message, loadingMessage, articles, index, topic) {
  const article = articles[index];
  
  if (!article) {
    return loadingMessage.edit('Could not find any news articles. Please try again later.');
  }
  
  // Format the publication date
  const pubDate = article.publishedAt ? new Date(article.publishedAt) : new Date();
  const timestamp = Math.floor(pubDate.getTime() / 1000);
  
  // Create embed for the article
  const embed = new EmbedBuilder()
    .setTitle(article.title || 'No Title')
    .setURL(article.url || 'https://newsapi.org')
    .setDescription(article.description || 'No description available.')
    .setColor('#3498db')
    .setImage(article.urlToImage || null)
    .addFields(
      { name: 'Source', value: article.source.name || 'Unknown', inline: true },
      { name: 'Published', value: `<t:${timestamp}:R>`, inline: true },
      { name: 'Category', value: topic.charAt(0).toUpperCase() + topic.slice(1), inline: true }
    )
    .setFooter({ 
      text: `Article ${index + 1}/${articles.length} • Powered by NewsAPI.org`,
      iconURL: message.author.displayAvatarURL({ dynamic: true })
    })
    .setTimestamp();
  
  // Create navigation buttons
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`news_prev_${message.id}`)
        .setLabel('Previous')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(index === 0),
      new ButtonBuilder()
        .setCustomId(`news_next_${message.id}`)
        .setLabel('Next')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(index === articles.length - 1),
      new ButtonBuilder()
        .setLabel('Read More')
        .setStyle(ButtonStyle.Link)
        .setURL(article.url || 'https://newsapi.org')
    );
  
  const response = await loadingMessage.edit({ content: null, embeds: [embed], components: [row] });
  
  // Create collector for button interactions
  const filter = i => {
    return i.customId.startsWith('news_') && 
           i.customId.endsWith(message.id) && 
           i.user.id === message.author.id;
  };
  
  const collector = response.createMessageComponentCollector({ filter, time: 60000 });
  
  collector.on('collect', async i => {
    if (i.customId === `news_prev_${message.id}`) {
      await i.deferUpdate();
      const newIndex = index - 1;
      await displayArticleLegacy(message, response, articles, newIndex, topic);
      collector.stop();
    } else if (i.customId === `news_next_${message.id}`) {
      await i.deferUpdate();
      const newIndex = index + 1;
      await displayArticleLegacy(message, response, articles, newIndex, topic);
      collector.stop();
    }
  });
  
  collector.on('end', async (collected, reason) => {
    if (reason === 'time' && response.editable) {
      // Disable buttons when collector expires
      const disabledRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`news_prev_${message.id}`)
            .setLabel('Previous')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId(`news_next_${message.id}`)
            .setLabel('Next')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true),
          new ButtonBuilder()
            .setLabel('Read More')
            .setStyle(ButtonStyle.Link)
            .setURL(article.url || 'https://newsapi.org')
        );
      
      await response.edit({ embeds: [embed], components: [disabledRow] }).catch(() => {});
    }
  });
}