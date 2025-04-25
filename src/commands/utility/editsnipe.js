const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../../utils/logger');

// Create a map to store edited messages
const editSnipeMap = new Map();

// Helper function to handle message update events
function handleEditedMessage(oldMessage, newMessage) {
  // Ignore DMs, system messages, bots, and empty messages
  if (!oldMessage.guild || oldMessage.system || oldMessage.author.bot || !oldMessage.content) return;
  
  // Create a key for this channel
  const key = oldMessage.channel.id;
  
  // Get the existing edited messages for this channel, or create a new array
  const channelEdits = editSnipeMap.get(key) || [];
  
  // Add the edited message to the array (limited to 10 messages)
  channelEdits.unshift({
    oldContent: oldMessage.content,
    newContent: newMessage.content,
    author: oldMessage.author,
    timestamp: Date.now(),
    attachments: [...oldMessage.attachments.values()],
    embeds: [...oldMessage.embeds]
  });
  
  // Keep only the 10 most recent messages
  if (channelEdits.length > 10) channelEdits.pop();
  
  // Update the map
  editSnipeMap.set(key, channelEdits);
  
  // Clear the messages after 1 hour
  setTimeout(() => {
    const currentEdits = editSnipeMap.get(key);
    if (currentEdits && currentEdits.length > 0) {
      // Remove the oldest message if it's the one we just added
      if (currentEdits[currentEdits.length - 1].timestamp === Date.now()) {
        currentEdits.pop();
        editSnipeMap.set(key, currentEdits);
      }
    }
  }, 3600000); // 1 hour
}

module.exports = {
  name: 'editsnipe',
  description: 'View recently edited messages in the channel',
  category: 'utility',
  aliases: ['es', 'editmsg'],
  usage: '[index]',
  examples: ['editsnipe', 'editsnipe 2'],
  userPermissions: [],
  botPermissions: [PermissionFlagsBits.ReadMessageHistory],
  
  data: new SlashCommandBuilder()
    .setName('editsnipe')
    .setDescription('View recently edited messages in the channel')
    .addIntegerOption(option => 
      option.setName('index')
        .setDescription('The index of the edited message to view (1-10)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(10)),
  
  // Register the message update handler
  init: (client) => {
    client.on('messageUpdate', handleEditedMessage);
  },
  
  // Slash command execution
  async execute(interaction) {
    try {
      const index = interaction.options.getInteger('index') || 1;
      const channel = interaction.channel;
      
      // Get the edited messages for this channel
      const editedMessages = editSnipeMap.get(channel.id);
      
      if (!editedMessages || editedMessages.length === 0) {
        return interaction.reply('There are no edited messages to snipe in this channel!');
      }
      
      // Get the requested message
      const messageIndex = index - 1;
      const sniped = editedMessages[messageIndex];
      
      if (!sniped) {
        return interaction.reply(`There are only ${editedMessages.length} edited messages in this channel!`);
      }
      
      // Create embed
      const embed = new EmbedBuilder()
        .setAuthor({ 
          name: sniped.author.tag, 
          iconURL: sniped.author.displayAvatarURL({ dynamic: true }) 
        })
        .setColor('#0099ff')
        .setFooter({ text: `Message ${index}/${editedMessages.length} | Edited` })
        .setTimestamp(sniped.timestamp)
        .addFields(
          { name: 'Before', value: sniped.oldContent || '*No content*', inline: false },
          { name: 'After', value: sniped.newContent || '*No content*', inline: false }
        );
      
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
      logger.error(`Error in editsnipe command: ${error}`);
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
      
      // Get the edited messages for this channel
      const editedMessages = editSnipeMap.get(channel.id);
      
      if (!editedMessages || editedMessages.length === 0) {
        return message.reply('There are no edited messages to snipe in this channel!');
      }
      
      // Get the requested message
      const messageIndex = index - 1;
      const sniped = editedMessages[messageIndex];
      
      if (!sniped) {
        return message.reply(`There are only ${editedMessages.length} edited messages in this channel!`);
      }
      
      // Create embed
      const embed = new EmbedBuilder()
        .setAuthor({ 
          name: sniped.author.tag, 
          iconURL: sniped.author.displayAvatarURL({ dynamic: true }) 
        })
        .setColor('#0099ff')
        .setFooter({ text: `Message ${index}/${editedMessages.length} | Edited` })
        .setTimestamp(sniped.timestamp)
        .addFields(
          { name: 'Before', value: sniped.oldContent || '*No content*', inline: false },
          { name: 'After', value: sniped.newContent || '*No content*', inline: false }
        );
      
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
      logger.error(`Error in legacy editsnipe command: ${error}`);
      message.reply('There was an error executing this command!');
    }
  }
};