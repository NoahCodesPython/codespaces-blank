const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../../utils/logger');

module.exports = {
  name: 'emojify',
  description: 'Convert text to emoji letters',
  category: 'fun',
  aliases: ['emoji-text'],
  usage: '<text>',
  examples: ['emojify Hello World', 'emojify Discord Bot'],
  userPermissions: [],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('emojify')
    .setDescription('Convert text to emoji letters')
    .addStringOption(option => 
      option.setName('text')
        .setDescription('The text to convert to emojis')
        .setRequired(true)),
  
  // Slash command execution
  async execute(interaction) {
    try {
      const text = interaction.options.getString('text');
      
      // Check if text is provided and not too long
      if (!text) {
        return interaction.reply({
          content: 'Please provide text to emojify!',
          ephemeral: true
        });
      }
      
      if (text.length > 100) {
        return interaction.reply({
          content: 'Your text is too long! Please keep it under 100 characters.',
          ephemeral: true
        });
      }
      
      // Convert text to emojis
      const emojified = emojify(text);
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle('Text to Emoji')
        .setDescription(emojified)
        .setColor('#FF69B4') // Hot pink
        .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing emojify command: ${error}`);
      await interaction.reply({ 
        content: 'There was an error executing this command!', 
        ephemeral: true 
      });
    }
  },
  
  // Legacy command execution
  async run(client, message, args) {
    try {
      // Check if text is provided
      if (!args.length) {
        return message.reply('Please provide text to emojify!');
      }
      
      const text = args.join(' ');
      
      // Check if text is not too long
      if (text.length > 100) {
        return message.reply('Your text is too long! Please keep it under 100 characters.');
      }
      
      // Convert text to emojis
      const emojified = emojify(text);
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle('Text to Emoji')
        .setDescription(emojified)
        .setColor('#FF69B4') // Hot pink
        .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      
      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing emojify command: ${error}`);
      message.reply('There was an error executing this command!');
    }
  }
};

/**
 * Convert text to emoji letters
 * @param {string} text - The text to convert
 * @returns {string} - The emojified text
 */
function emojify(text) {
  const characters = {
    'a': '🇦', 'b': '🇧', 'c': '🇨', 'd': '🇩', 'e': '🇪',
    'f': '🇫', 'g': '🇬', 'h': '🇭', 'i': '🇮', 'j': '🇯',
    'k': '🇰', 'l': '🇱', 'm': '🇲', 'n': '🇳', 'o': '🇴',
    'p': '🇵', 'q': '🇶', 'r': '🇷', 's': '🇸', 't': '🇹',
    'u': '🇺', 'v': '🇻', 'w': '🇼', 'x': '🇽', 'y': '🇾',
    'z': '🇿', '0': '0️⃣', '1': '1️⃣', '2': '2️⃣', '3': '3️⃣',
    '4': '4️⃣', '5': '5️⃣', '6': '6️⃣', '7': '7️⃣', '8': '8️⃣',
    '9': '9️⃣', ' ': '  ', '!': '❗', '?': '❓', '#': '#️⃣',
    '*': '*️⃣', '+': '➕', '-': '➖', '×': '✖️', '÷': '➗',
    '$': '💲', '.': '.'
  };
  
  let result = '';
  for (const char of text.toLowerCase()) {
    result += characters[char] || char;
    result += ' '; // Add space between characters
  }
  
  return result;
}