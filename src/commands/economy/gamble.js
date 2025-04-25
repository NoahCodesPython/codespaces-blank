const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../../models/User');
const logger = require('../../utils/logger');

module.exports = {
  name: 'gamble',
  description: 'Gamble your money for a chance to win more',
  category: 'economy',
  aliases: ['bet', 'slots'],
  usage: '<amount>',
  examples: ['gamble 1000', 'bet 500'],
  userPermissions: [],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('gamble')
    .setDescription('Gamble your money for a chance to win more')
    .addIntegerOption(option => 
      option.setName('amount')
        .setDescription('The amount to gamble')
        .setRequired(true)
        .setMinValue(100)),
  
  // Slash command execution
  async execute(interaction) {
    try {
      // Get options
      const amount = interaction.options.getInteger('amount');
      
      // Get user data from database
      let userData = await User.findOne({ userID: interaction.user.id });
      
      if (!userData) {
        // Create new user if not found
        userData = new User({
          userID: interaction.user.id,
          economy: {
            wallet: 0,
            bank: 0
          }
        });
        await userData.save();
        
        return interaction.reply({
          content: 'You don\'t have any money to gamble!',
          ephemeral: true
        });
      }
      
      // Check if user has enough money
      if (userData.economy.wallet < amount) {
        return interaction.reply({
          content: `You don't have enough money in your wallet! You only have $${userData.economy.wallet.toLocaleString()}.`,
          ephemeral: true
        });
      }
      
      // Minimum bet check
      if (amount < 100) {
        return interaction.reply({
          content: 'The minimum bet amount is $100.',
          ephemeral: true
        });
      }
      
      // Generate random number between 0 and 100
      const chance = Math.random() * 100;
      
      // Determine if the user won or lost
      let won = false;
      let multiplier = 0;
      let resultMessage = '';
      let resultColor = '';
      
      if (chance < 40) {
        // 40% chance to lose
        won = false;
        resultMessage = 'You lost! Better luck next time.';
        resultColor = '#FF0000';
      } else if (chance < 85) {
        // 45% chance to win 1.5x
        won = true;
        multiplier = 1.5;
        resultMessage = '🎉 You won! (1.5x)';
        resultColor = '#00FF00';
      } else if (chance < 95) {
        // 10% chance to win 2x
        won = true;
        multiplier = 2;
        resultMessage = '🎉🎉 You won big! (2x)';
        resultColor = '#00FF00';
      } else {
        // 5% chance to win 3x
        won = true;
        multiplier = 3;
        resultMessage = '🎉🎉🎉 JACKPOT! (3x)';
        resultColor = '#FFFF00';
      }
      
      // Calculate winnings or losses
      let winnings = 0;
      if (won) {
        winnings = Math.floor(amount * multiplier);
        userData.economy.wallet += (winnings - amount); // Add winnings minus the original bet
      } else {
        userData.economy.wallet -= amount; // Lose the bet amount
      }
      
      // Save user data
      await userData.save();
      
      // Create result embed
      const embed = new EmbedBuilder()
        .setTitle('🎰 Gambling Results')
        .setDescription(resultMessage)
        .setColor(resultColor)
        .addFields(
          { name: 'Amount Bet', value: `$${amount.toLocaleString()}`, inline: true },
          { name: won ? 'Amount Won' : 'Amount Lost', value: won ? `$${(winnings - amount).toLocaleString()}` : `$${amount.toLocaleString()}`, inline: true },
          { name: '💵 New Balance', value: `$${userData.economy.wallet.toLocaleString()}`, inline: true }
        )
        .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing gamble command: ${error}`);
      await interaction.reply({ 
        content: 'There was an error executing this command!', 
        ephemeral: true 
      });
    }
  },
  
  // Legacy command execution
  async run(client, message, args) {
    try {
      // Check if amount was provided
      if (!args.length) {
        return message.reply('Please specify an amount to gamble.');
      }
      
      // Parse the amount
      const amount = parseInt(args[0]);
      
      // Check if amount is valid
      if (isNaN(amount) || amount <= 0) {
        return message.reply('Please provide a valid amount to gamble.');
      }
      
      // Minimum bet check
      if (amount < 100) {
        return message.reply('The minimum bet amount is $100.');
      }
      
      // Get user data from database
      let userData = await User.findOne({ userID: message.author.id });
      
      if (!userData) {
        // Create new user if not found
        userData = new User({
          userID: message.author.id,
          economy: {
            wallet: 0,
            bank: 0
          }
        });
        await userData.save();
        
        return message.reply('You don\'t have any money to gamble!');
      }
      
      // Check if user has enough money
      if (userData.economy.wallet < amount) {
        return message.reply(`You don't have enough money in your wallet! You only have $${userData.economy.wallet.toLocaleString()}.`);
      }
      
      // Generate random number between 0 and 100
      const chance = Math.random() * 100;
      
      // Determine if the user won or lost
      let won = false;
      let multiplier = 0;
      let resultMessage = '';
      let resultColor = '';
      
      if (chance < 40) {
        // 40% chance to lose
        won = false;
        resultMessage = 'You lost! Better luck next time.';
        resultColor = '#FF0000';
      } else if (chance < 85) {
        // 45% chance to win 1.5x
        won = true;
        multiplier = 1.5;
        resultMessage = '🎉 You won! (1.5x)';
        resultColor = '#00FF00';
      } else if (chance < 95) {
        // 10% chance to win 2x
        won = true;
        multiplier = 2;
        resultMessage = '🎉🎉 You won big! (2x)';
        resultColor = '#00FF00';
      } else {
        // 5% chance to win 3x
        won = true;
        multiplier = 3;
        resultMessage = '🎉🎉🎉 JACKPOT! (3x)';
        resultColor = '#FFFF00';
      }
      
      // Calculate winnings or losses
      let winnings = 0;
      if (won) {
        winnings = Math.floor(amount * multiplier);
        userData.economy.wallet += (winnings - amount); // Add winnings minus the original bet
      } else {
        userData.economy.wallet -= amount; // Lose the bet amount
      }
      
      // Save user data
      await userData.save();
      
      // Create result embed
      const embed = new EmbedBuilder()
        .setTitle('🎰 Gambling Results')
        .setDescription(resultMessage)
        .setColor(resultColor)
        .addFields(
          { name: 'Amount Bet', value: `$${amount.toLocaleString()}`, inline: true },
          { name: won ? 'Amount Won' : 'Amount Lost', value: won ? `$${(winnings - amount).toLocaleString()}` : `$${amount.toLocaleString()}`, inline: true },
          { name: '💵 New Balance', value: `$${userData.economy.wallet.toLocaleString()}`, inline: true }
        )
        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      
      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing gamble command: ${error}`);
      message.reply('There was an error executing this command!');
    }
  }
};