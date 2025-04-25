const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../../models/User');
const logger = require('../../utils/logger');

module.exports = {
  name: 'withdraw',
  description: 'Withdraw money from your bank',
  category: 'economy',
  aliases: ['with'],
  usage: '<amount | all>',
  examples: ['withdraw 1000', 'withdraw all'],
  userPermissions: [],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('withdraw')
    .setDescription('Withdraw money from your bank')
    .addStringOption(option => 
      option.setName('amount')
        .setDescription('The amount to withdraw (or "all" to withdraw everything)')
        .setRequired(true)),
  
  // Slash command execution
  async execute(interaction) {
    try {
      // Get the withdraw amount
      const amountInput = interaction.options.getString('amount');
      
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
          content: 'You don\'t have any money in your bank to withdraw!',
          ephemeral: true
        });
      }
      
      // Check if user has money to withdraw
      if (userData.economy.bank <= 0) {
        return interaction.reply({
          content: 'You don\'t have any money in your bank to withdraw!',
          ephemeral: true
        });
      }
      
      // Determine amount to withdraw
      let withdrawAmount;
      if (amountInput.toLowerCase() === 'all') {
        withdrawAmount = userData.economy.bank;
      } else {
        withdrawAmount = parseInt(amountInput);
        
        // Check if amount is valid
        if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
          return interaction.reply({
            content: 'Please provide a valid amount to withdraw.',
            ephemeral: true
          });
        }
        
        // Check if user has enough money in the bank
        if (withdrawAmount > userData.economy.bank) {
          return interaction.reply({
            content: `You don't have that much money in your bank! You only have $${userData.economy.bank.toLocaleString()} in your bank.`,
            ephemeral: true
          });
        }
      }
      
      // Update user's wallet and bank
      userData.economy.bank -= withdrawAmount;
      userData.economy.wallet += withdrawAmount;
      await userData.save();
      
      // Create success embed
      const embed = new EmbedBuilder()
        .setTitle('Withdrawal Successful')
        .setDescription(`You have withdrawn **$${withdrawAmount.toLocaleString()}** from your bank account.`)
        .setColor('#00FF00')
        .addFields(
          { name: '💵 Wallet Balance', value: `$${userData.economy.wallet.toLocaleString()}`, inline: true },
          { name: '🏦 Bank Balance', value: `$${userData.economy.bank.toLocaleString()}`, inline: true }
        )
        .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing withdraw command: ${error}`);
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
        return message.reply('Please specify an amount to withdraw or use `all` to withdraw everything.');
      }
      
      // Get the withdraw amount
      const amountInput = args[0].toLowerCase();
      
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
        
        return message.reply('You don\'t have any money in your bank to withdraw!');
      }
      
      // Check if user has money to withdraw
      if (userData.economy.bank <= 0) {
        return message.reply('You don\'t have any money in your bank to withdraw!');
      }
      
      // Determine amount to withdraw
      let withdrawAmount;
      if (amountInput === 'all') {
        withdrawAmount = userData.economy.bank;
      } else {
        withdrawAmount = parseInt(amountInput);
        
        // Check if amount is valid
        if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
          return message.reply('Please provide a valid amount to withdraw.');
        }
        
        // Check if user has enough money in the bank
        if (withdrawAmount > userData.economy.bank) {
          return message.reply(`You don't have that much money in your bank! You only have $${userData.economy.bank.toLocaleString()} in your bank.`);
        }
      }
      
      // Update user's wallet and bank
      userData.economy.bank -= withdrawAmount;
      userData.economy.wallet += withdrawAmount;
      await userData.save();
      
      // Create success embed
      const embed = new EmbedBuilder()
        .setTitle('Withdrawal Successful')
        .setDescription(`You have withdrawn **$${withdrawAmount.toLocaleString()}** from your bank account.`)
        .setColor('#00FF00')
        .addFields(
          { name: '💵 Wallet Balance', value: `$${userData.economy.wallet.toLocaleString()}`, inline: true },
          { name: '🏦 Bank Balance', value: `$${userData.economy.bank.toLocaleString()}`, inline: true }
        )
        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      
      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing withdraw command: ${error}`);
      message.reply('There was an error executing this command!');
    }
  }
};