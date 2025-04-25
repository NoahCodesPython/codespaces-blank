const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../../utils/logger');
const { getRandomMeme, getRandomPost } = require('../../utils/reddit');

module.exports = {
  name: 'meme',
  description: 'Get a random meme from Reddit',
  category: 'fun',
  aliases: ['memes', 'randommeme'],
  usage: '[subreddit]',
  examples: ['meme', 'meme dankmemes'],
  userPermissions: [],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('meme')
    .setDescription('Get a random meme from Reddit')
    .addStringOption(option => 
      option.setName('subreddit')
        .setDescription('Optional specific subreddit to fetch from')
        .setRequired(false)),
  
  // Slash command execution
  async execute(interaction) {
    try {
      // Defer the reply to give time to fetch the meme
      await interaction.deferReply();
      
      // Get the subreddit if provided
      const subreddit = interaction.options.getString('subreddit');
      
      // Fetch the meme
      const memeData = subreddit ? await getRandomPost(subreddit) : await getRandomMeme();
      
      if (!memeData) {
        return interaction.editReply({
          content: subreddit 
            ? `Failed to fetch a meme from r/${subreddit}. The subreddit may not exist or doesn't have suitable image posts.` 
            : 'Failed to fetch a meme. Please try again later.'
        });
      }
      
      // Create embed with the meme
      const embed = new EmbedBuilder()
        .setTitle(memeData.title)
        .setURL(`https://reddit.com${memeData.permalink}`)
        .setImage(memeData.url)
        .setColor('#FF4500') // Reddit orange
        .setFooter({ 
          text: `👍 ${memeData.ups} | 💬 ${memeData.num_comments} | r/${memeData.subreddit}`, 
          iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
        })
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing meme command: ${error}`);
      
      // If already deferred, edit the reply
      if (interaction.deferred) {
        await interaction.editReply({ 
          content: 'There was an error fetching a meme!', 
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
      // Send a loading message
      const loadingMessage = await message.reply('Fetching a meme...');
      
      // Get the subreddit if provided
      const subreddit = args[0];
      
      // Fetch the meme
      const memeData = subreddit ? await getRandomPost(subreddit) : await getRandomMeme();
      
      if (!memeData) {
        return loadingMessage.edit(
          subreddit 
            ? `Failed to fetch a meme from r/${subreddit}. The subreddit may not exist or doesn't have suitable image posts.` 
            : 'Failed to fetch a meme. Please try again later.'
        );
      }
      
      // Create embed with the meme
      const embed = new EmbedBuilder()
        .setTitle(memeData.title)
        .setURL(`https://reddit.com${memeData.permalink}`)
        .setImage(memeData.url)
        .setColor('#FF4500') // Reddit orange
        .setFooter({ 
          text: `👍 ${memeData.ups} | 💬 ${memeData.num_comments} | r/${memeData.subreddit}`, 
          iconURL: message.author.displayAvatarURL({ dynamic: true }) 
        })
        .setTimestamp();
      
      await loadingMessage.edit({ content: null, embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing meme command: ${error}`);
      message.reply('There was an error fetching a meme!');
    }
  }
};