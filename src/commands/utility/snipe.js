const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../../utils/logger');

// Create a map to store deleted messages
const snipeMap = new Map();

// Helper function to handle message deletion events
function handleDeletedMessage(message) {
  // Ignore DMs, system messages, bots, and empty messages
  if (!message.guild || message.system || message.author.bot || !message.content) return;
  
  // Create a key for this channel
  const key = message.channel.id;
  
  // Get the existing deleted messages for this channel, or create a new array
  const channelSnipes = snipeMap.get(key) || [];
  
  // Add the deleted message to the array (limited to 10 messages)
  channelSnipes.unshift({
    content: message.content,
    author: message.author,
    timestamp: message.createdTimestamp,
    attachments: [...message.attachments.values()],
    embeds: [...message.embeds]
  });
  
  // Keep only the 10 most recent messages
  if (channelSnipes.length > 10) channelSnipes.pop();
  
  // Update the map
  snipeMap.set(key, channelSnipes);
  
  // Clear the messages after 1 hour
  setTimeout(() => {
    const currentSnipes = snipeMap.get(key);
    if (currentSnipes && currentSnipes.length > 0) {
      // Remove the oldest message if it's the one we just added
      if (currentSnipes[currentSnipes.length - 1].timestamp === message.createdTimestamp) {
        currentSnipes.pop();
        snipeMap.set(key, currentSnipes);
      }
    }
  }, 3600000); // 1 hour
}

module.exports = {
  name: 'snipe',
  description: 'View recently deleted messages in the channel',
  category: 'utility',
  aliases: ['s', 'deletedmsg'],
  usage: '[index]',
  examples: ['snipe', 'snipe 2'],
  userPermissions: [],
  botPermissions: [PermissionFlagsBits.ReadMessageHistory],
  
  data: new SlashCommandBuilder()
    .setName('snipe')
    .setDescription('View recently deleted messages in the channel')
    .addIntegerOption(option => 
      option.setName('index')
        .setDescription('The index of the deleted message to view (1-10)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(10)),
  
  // Register the message delete handler
  init: (client) => {
    client.on('messageDelete', handleDeletedMessage);
  },
  
  // Slash command execution
  async execute(interaction) {
    try {
      const index = interaction.options.getInteger('index') || 1;
      const channel = interaction.channel;
      
      // Get the deleted messages for this channel
      const deletedMessages = snipeMap.get(channel.id);
      
      if (!deletedMessages || deletedMessages.length === 0) {
        return interaction.reply('There are no deleted messages to snipe in this channel!');
      }
      
      // Get the requested message
      const messageIndex = index - 1;
      const sniped = deletedMessages[messageIndex];
      
      if (!sniped) {
        return interaction.reply(`There are only ${deletedMessages.length} deleted messages in this channel!`);
      }
      
      // Create embed
      const embed = new EmbedBuilder()
        .setAuthor({ 
          name: sniped.author.tag, 
          iconURL: sniped.author.displayAvatarURL({ dynamic: true }) 
        })
        .setDescription(sniped.content || '*No content*')
        .setColor('#0099ff')
        .setFooter({ text: `Message ${index}/${deletedMessages.length} | Deleted` })
        .setTimestamp(sniped.timestamp);
      
      // Add attachment information if available
      if (sniped.attachments.length > 0) {
        const attachment = sniped.attachments[0];
        
        // If it's an image, show it in the embed
        if (attachment.contentType && attachment.contentType.startsWith('image/')) {
          embed.setImage(attachment.proxyURL);
        }
        
        if (sniped.attachments.length > 1) {
          embed.addFields({ 
            name: 'Attachments', 
            value: `${sniped.attachments.length} attachments were sent with this message.`
          });
        }
      }
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error in snipe command: ${error}`);
      interaction.reply({ 
        content: 'There was an error executing this command!', 
        ephemeral: true 
      });
    }
  },
  
  // Legacy command execution
  async run(client, message, args) {
    try {
      const index = parseInt(args[0]) || 1;
      const channel = message.channel;
      
      // Get the deleted messages for this channel
      const deletedMessages = snipeMap.get(channel.id);
      
      if (!deletedMessages || deletedMessages.length === 0) {
        return message.reply('There are no deleted messages to snipe in this channel!');
      }
      
      // Get the requested message
      const messageIndex = index - 1;
      const sniped = deletedMessages[messageIndex];
      
      if (!sniped) {
        return message.reply(`There are only ${deletedMessages.length} deleted messages in this channel!`);
      }
      
      // Create embed
      const embed = new EmbedBuilder()
        .setAuthor({ 
          name: sniped.author.tag, 
          iconURL: sniped.author.displayAvatarURL({ dynamic: true }) 
        })
        .setDescription(sniped.content || '*No content*')
        .setColor('#0099ff')
        .setFooter({ text: `Message ${index}/${deletedMessages.length} | Deleted` })
        .setTimestamp(sniped.timestamp);
      
      // Add attachment information if available
      if (sniped.attachments.length > 0) {
        const attachment = sniped.attachments[0];
        
        // If it's an image, show it in the embed
        if (attachment.contentType && attachment.contentType.startsWith('image/')) {
          embed.setImage(attachment.proxyURL);
        }
        
        if (sniped.attachments.length > 1) {
          embed.addFields({ 
            name: 'Attachments', 
            value: `${sniped.attachments.length} attachments were sent with this message.`
          });
        }
      }
      
      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error in legacy snipe command: ${error}`);
      message.reply('There was an error executing this command!');
    }
  }
};