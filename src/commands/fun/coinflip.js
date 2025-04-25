const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const Guild = require('../../models/Guild');
const logger = require('../../utils/logger');

module.exports = {
  name: 'coinflip',
  description: 'Flip a coin',
  category: 'fun',
  aliases: ['cointoss'],
  cooldown: 3,
  
  // Slash command data
  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Flip a coin'),
  
  // Execute slash command
  async execute(client, interaction) {
    try {
      const n = Math.floor(Math.random() * 2);
      let result = n === 1 ? 'heads' : 'tails';
      
      const initialEmbed = new EmbedBuilder()
        .setDescription('`Flipping a coin...`')
        .setColor('#3498db');
      
      const msg = await interaction.reply({ embeds: [initialEmbed], fetchReply: true });
      
      // Wait a bit for effect
      setTimeout(async () => {
        const resultEmbed = new EmbedBuilder()
          .setDescription(`I flipped a coin for ${interaction.user}, it was **${result}**`)
          .setColor('#3498db');
        
        await interaction.editReply({ embeds: [resultEmbed] });
      }, 1000);
    } catch (error) {
      logger.error(`Error in coinflip command: ${error}`);
      await interaction.reply({ content: 'There was an error flipping the coin!', ephemeral: true });
    }
  },
  
  // Execute legacy command
  async run(client, message, args) {
    try {
      const n = Math.floor(Math.random() * 2);
      let result = n === 1 ? 'heads' : 'tails';
      
      const initialEmbed = new EmbedBuilder()
        .setDescription('`Flipping a coin...`')
        .setColor('#3498db');
      
      const msg = await message.channel.send({ embeds: [initialEmbed] });
      
      // Wait a bit for effect
      setTimeout(async () => {
        const resultEmbed = new EmbedBuilder()
          .setDescription(`I flipped a coin for ${message.member}, it was **${result}**`)
          .setColor('#3498db');
        
        await msg.edit({ embeds: [resultEmbed] }).catch(() => {});
      }, 1000);
    } catch (error) {
      logger.error(`Error in coinflip command: ${error}`);
      await message.channel.send('There was an error flipping the coin!');
    }
  }
};