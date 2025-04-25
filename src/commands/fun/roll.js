const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../../utils/logger');

module.exports = {
  name: 'roll',
  description: 'Roll one or more dice with a specified number of sides',
  category: 'fun',
  aliases: ['dice', 'diceroll'],
  usage: '[number of dice]d[number of sides]',
  examples: ['roll', 'roll 2d6', 'roll 1d20'],
  userPermissions: [],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('roll')
    .setDescription('Roll one or more dice with a specified number of sides')
    .addStringOption(option => 
      option.setName('dice')
        .setDescription('Format: NdS (e.g., 2d6 for two 6-sided dice)')
        .setRequired(false)),
  
  // Slash command execution
  async execute(interaction) {
    try {
      // Get dice format, default to 1d6
      const diceFormat = interaction.options.getString('dice') || '1d6';
      
      // Parse the dice format
      const match = diceFormat.match(/^(\d+)d(\d+)$/i);
      
      if (!match) {
        return interaction.reply({
          content: 'Invalid dice format! Please use the format `NdS` (e.g., `2d6` for two 6-sided dice).',
          ephemeral: true
        });
      }
      
      const numDice = parseInt(match[1]);
      const numSides = parseInt(match[2]);
      
      // Validate input
      if (numDice <= 0 || numDice > 25) {
        return interaction.reply({
          content: 'Please specify between 1 and 25 dice.',
          ephemeral: true
        });
      }
      
      if (numSides <= 1 || numSides > 100) {
        return interaction.reply({
          content: 'Please specify a die with between 2 and 100 sides.',
          ephemeral: true
        });
      }
      
      // Roll the dice
      const rolls = [];
      let total = 0;
      
      for (let i = 0; i < numDice; i++) {
        const roll = Math.floor(Math.random() * numSides) + 1;
        rolls.push(roll);
        total += roll;
      }
      
      // Create the result message
      let resultText;
      if (numDice === 1) {
        resultText = `You rolled a **${rolls[0]}**!`;
      } else {
        resultText = `You rolled: ${rolls.map(r => `**${r}**`).join(', ')}\nTotal: **${total}**`;
      }
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle(`🎲 Dice Roll: ${diceFormat}`)
        .setDescription(resultText)
        .setColor('#4B0082') // Indigo color
        .setFooter({ text: `Rolled by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing roll command: ${error}`);
      await interaction.reply({ 
        content: 'There was an error executing this command!', 
        ephemeral: true 
      });
    }
  },
  
  // Legacy command execution
  async run(client, message, args) {
    try {
      // Get dice format, default to 1d6
      const diceFormat = args[0] || '1d6';
      
      // Parse the dice format
      const match = diceFormat.match(/^(\d+)d(\d+)$/i);
      
      if (!match) {
        return message.reply('Invalid dice format! Please use the format `NdS` (e.g., `2d6` for two 6-sided dice).');
      }
      
      const numDice = parseInt(match[1]);
      const numSides = parseInt(match[2]);
      
      // Validate input
      if (numDice <= 0 || numDice > 25) {
        return message.reply('Please specify between 1 and 25 dice.');
      }
      
      if (numSides <= 1 || numSides > 100) {
        return message.reply('Please specify a die with between 2 and 100 sides.');
      }
      
      // Roll the dice
      const rolls = [];
      let total = 0;
      
      for (let i = 0; i < numDice; i++) {
        const roll = Math.floor(Math.random() * numSides) + 1;
        rolls.push(roll);
        total += roll;
      }
      
      // Create the result message
      let resultText;
      if (numDice === 1) {
        resultText = `You rolled a **${rolls[0]}**!`;
      } else {
        resultText = `You rolled: ${rolls.map(r => `**${r}**`).join(', ')}\nTotal: **${total}**`;
      }
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle(`🎲 Dice Roll: ${diceFormat}`)
        .setDescription(resultText)
        .setColor('#4B0082') // Indigo color
        .setFooter({ text: `Rolled by ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      
      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing roll command: ${error}`);
      message.reply('There was an error executing this command!');
    }
  }
};