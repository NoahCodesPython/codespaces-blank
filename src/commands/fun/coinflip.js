const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../../utils/logger');

module.exports = {
  name: 'coinflip',
  description: 'Flip a coin',
  category: 'fun',
  aliases: ['flip', 'coin'],
  usage: '',
  examples: ['coinflip'],
  userPermissions: [],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Flip a coin'),
  
  // Slash command execution
  async execute(interaction) {
    try {
      // Get result (50% chance for heads, 50% chance for tails)
      const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
      const emoji = result === 'Heads' ? '🪙' : '💿';
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle('Coin Flip')
        .setDescription(`${emoji} The coin landed on **${result}**!`)
        .setColor('#FFD700') // Gold color
        .setFooter({ text: `Flipped by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing coinflip command: ${error}`);
      await interaction.reply({ 
        content: 'There was an error executing this command!', 
        ephemeral: true 
      });
    }
  },
  
  // Legacy command execution
  async run(client, message, args) {
    try {
      // Get result (50% chance for heads, 50% chance for tails)
      const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
      const emoji = result === 'Heads' ? '🪙' : '💿';
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle('Coin Flip')
        .setDescription(`${emoji} The coin landed on **${result}**!`)
        .setColor('#FFD700') // Gold color
        .setFooter({ text: `Flipped by ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      
      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing coinflip command: ${error}`);
      message.reply('There was an error executing this command!');
    }
  }
};