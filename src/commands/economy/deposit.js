const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../../models/User');
const logger = require('../../utils/logger');

module.exports = {
  name: 'deposit',
  description: 'Deposit money into your bank',
  category: 'economy',
  aliases: ['dep'],
  usage: '<amount | all>',
  examples: ['deposit 1000', 'deposit all'],
  userPermissions: [],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('deposit')
    .setDescription('Deposit money into your bank')
    .addStringOption(option => 
      option.setName('amount')
        .setDescription('The amount to deposit (or "all" to deposit everything)')
        .setRequired(true)),
  
  // Slash command execution
  async execute(interaction) {
    try {
      // Get the deposit amount
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
          content: 'You don\'t have any money to deposit!',
          ephemeral: true
        });
      }
      
      // Check if user has money to deposit
      if (userData.economy.wallet <= 0) {
        return interaction.reply({
          content: 'You don\'t have any money to deposit!',
          ephemeral: true
        });
      }
      
      // Determine amount to deposit
      let depositAmount;
      if (amountInput.toLowerCase() === 'all') {
        depositAmount = userData.economy.wallet;
      } else {
        depositAmount = parseInt(amountInput);
        
        // Check if amount is valid
        if (isNaN(depositAmount) || depositAmount <= 0) {
          return interaction.reply({
            content: 'Please provide a valid amount to deposit.',
            ephemeral: true
          });
        }
        
        // Check if user has enough money
        if (depositAmount > userData.economy.wallet) {
          return interaction.reply({
            content: `You don't have that much money! You only have $${userData.economy.wallet.toLocaleString()} in your wallet.`,
            ephemeral: true
          });
        }
      }
      
      // Update user's wallet and bank
      userData.economy.wallet -= depositAmount;
      userData.economy.bank += depositAmount;
      await userData.save();
      
      // Create success embed
      const embed = new EmbedBuilder()
        .setTitle('Deposit Successful')
        .setDescription(`You have deposited **$${depositAmount.toLocaleString()}** into your bank account.`)
        .setColor('#00FF00')
        .addFields(
          { name: '💵 Wallet Balance', value: `$${userData.economy.wallet.toLocaleString()}`, inline: true },
          { name: '🏦 Bank Balance', value: `$${userData.economy.bank.toLocaleString()}`, inline: true }
        )
        .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing deposit command: ${error}`);
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
        return message.reply('Please specify an amount to deposit or use `all` to deposit everything.');
      }
      
      // Get the deposit amount
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
        
        return message.reply('You don\'t have any money to deposit!');
      }
      
      // Check if user has money to deposit
      if (userData.economy.wallet <= 0) {
        return message.reply('You don\'t have any money to deposit!');
      }
      
      // Determine amount to deposit
      let depositAmount;
      if (amountInput === 'all') {
        depositAmount = userData.economy.wallet;
      } else {
        depositAmount = parseInt(amountInput);
        
        // Check if amount is valid
        if (isNaN(depositAmount) || depositAmount <= 0) {
          return message.reply('Please provide a valid amount to deposit.');
        }
        
        // Check if user has enough money
        if (depositAmount > userData.economy.wallet) {
          return message.reply(`You don't have that much money! You only have $${userData.economy.wallet.toLocaleString()} in your wallet.`);
        }
      }
      
      // Update user's wallet and bank
      userData.economy.wallet -= depositAmount;
      userData.economy.bank += depositAmount;
      await userData.save();
      
      // Create success embed
      const embed = new EmbedBuilder()
        .setTitle('Deposit Successful')
        .setDescription(`You have deposited **$${depositAmount.toLocaleString()}** into your bank account.`)
        .setColor('#00FF00')
        .addFields(
          { name: '💵 Wallet Balance', value: `$${userData.economy.wallet.toLocaleString()}`, inline: true },
          { name: '🏦 Bank Balance', value: `$${userData.economy.bank.toLocaleString()}`, inline: true }
        )
        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      
      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing deposit command: ${error}`);
      message.reply('There was an error executing this command!');
    }
  }
};