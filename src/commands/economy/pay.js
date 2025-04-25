const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../../models/User');
const logger = require('../../utils/logger');

module.exports = {
  name: 'pay',
  description: 'Pay another user from your wallet',
  category: 'economy',
  aliases: ['transfer', 'give', 'send'],
  usage: '<user> <amount>',
  examples: ['pay @User 1000', 'transfer @User 500'],
  userPermissions: [],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('pay')
    .setDescription('Pay another user from your wallet')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to pay')
        .setRequired(true))
    .addIntegerOption(option => 
      option.setName('amount')
        .setDescription('The amount to pay')
        .setRequired(true)
        .setMinValue(1)),
  
  // Slash command execution
  async execute(interaction) {
    try {
      // Get options
      const targetUser = interaction.options.getUser('user');
      const amount = interaction.options.getInteger('amount');
      
      // Check if user is trying to pay themselves
      if (targetUser.id === interaction.user.id) {
        return interaction.reply({
          content: 'You cannot pay yourself!',
          ephemeral: true
        });
      }
      
      // Check if target is a bot
      if (targetUser.bot) {
        return interaction.reply({
          content: 'You cannot pay bots!',
          ephemeral: true
        });
      }
      
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
          content: 'You don\'t have any money to pay!',
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
      
      // Get or create target user data
      let targetUserData = await User.findOne({ userID: targetUser.id });
      
      if (!targetUserData) {
        targetUserData = new User({
          userID: targetUser.id,
          economy: {
            wallet: 0,
            bank: 0
          }
        });
      }
      
      // Transfer the money
      userData.economy.wallet -= amount;
      targetUserData.economy.wallet += amount;
      
      // Save both users' data
      await userData.save();
      await targetUserData.save();
      
      // Create success embed
      const embed = new EmbedBuilder()
        .setTitle('Payment Successful')
        .setDescription(`You have paid **${targetUser.tag}** $${amount.toLocaleString()}.`)
        .setColor('#00FF00')
        .addFields(
          { name: '💵 Your Wallet Balance', value: `$${userData.economy.wallet.toLocaleString()}`, inline: true }
        )
        .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      
      // Try to notify the target user
      try {
        const dmEmbed = new EmbedBuilder()
          .setTitle('Payment Received')
          .setDescription(`You have received a payment of **$${amount.toLocaleString()}** from **${interaction.user.tag}**.`)
          .setColor('#00FF00')
          .addFields(
            { name: '💵 Your New Wallet Balance', value: `$${targetUserData.economy.wallet.toLocaleString()}`, inline: true }
          )
          .setFooter({ text: targetUser.tag, iconURL: targetUser.displayAvatarURL({ dynamic: true }) })
          .setTimestamp();
        
        await targetUser.send({ embeds: [dmEmbed] }).catch(() => {
          // If sending DM fails, ignore the error
        });
      } catch (error) {
        // Ignore DM errors
        logger.warn(`Failed to send payment notification DM to ${targetUser.tag}: ${error}`);
      }
      
    } catch (error) {
      logger.error(`Error executing pay command: ${error}`);
      await interaction.reply({ 
        content: 'There was an error executing this command!', 
        ephemeral: true 
      });
    }
  },
  
  // Legacy command execution
  async run(client, message, args) {
    try {
      // Check if both user and amount were provided
      if (args.length < 2) {
        return message.reply('Please specify a user and an amount to pay.');
      }
      
      // Get the target user
      const targetUser = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null);
      
      if (!targetUser) {
        return message.reply('Please specify a valid user to pay.');
      }
      
      // Check if user is trying to pay themselves
      if (targetUser.id === message.author.id) {
        return message.reply('You cannot pay yourself!');
      }
      
      // Check if target is a bot
      if (targetUser.bot) {
        return message.reply('You cannot pay bots!');
      }
      
      // Parse the amount
      const amount = parseInt(args[1]);
      
      // Check if amount is valid
      if (isNaN(amount) || amount <= 0) {
        return message.reply('Please provide a valid amount to pay.');
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
        
        return message.reply('You don\'t have any money to pay!');
      }
      
      // Check if user has enough money
      if (userData.economy.wallet < amount) {
        return message.reply(`You don't have enough money in your wallet! You only have $${userData.economy.wallet.toLocaleString()}.`);
      }
      
      // Get or create target user data
      let targetUserData = await User.findOne({ userID: targetUser.id });
      
      if (!targetUserData) {
        targetUserData = new User({
          userID: targetUser.id,
          economy: {
            wallet: 0,
            bank: 0
          }
        });
      }
      
      // Transfer the money
      userData.economy.wallet -= amount;
      targetUserData.economy.wallet += amount;
      
      // Save both users' data
      await userData.save();
      await targetUserData.save();
      
      // Create success embed
      const embed = new EmbedBuilder()
        .setTitle('Payment Successful')
        .setDescription(`You have paid **${targetUser.tag}** $${amount.toLocaleString()}.`)
        .setColor('#00FF00')
        .addFields(
          { name: '💵 Your Wallet Balance', value: `$${userData.economy.wallet.toLocaleString()}`, inline: true }
        )
        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      
      await message.reply({ embeds: [embed] });
      
      // Try to notify the target user
      try {
        const dmEmbed = new EmbedBuilder()
          .setTitle('Payment Received')
          .setDescription(`You have received a payment of **$${amount.toLocaleString()}** from **${message.author.tag}**.`)
          .setColor('#00FF00')
          .addFields(
            { name: '💵 Your New Wallet Balance', value: `$${targetUserData.economy.wallet.toLocaleString()}`, inline: true }
          )
          .setFooter({ text: targetUser.tag, iconURL: targetUser.displayAvatarURL({ dynamic: true }) })
          .setTimestamp();
        
        await targetUser.send({ embeds: [dmEmbed] }).catch(() => {
          // If sending DM fails, ignore the error
        });
      } catch (error) {
        // Ignore DM errors
        logger.warn(`Failed to send payment notification DM to ${targetUser.tag}: ${error}`);
      }
      
    } catch (error) {
      logger.error(`Error executing pay command: ${error}`);
      message.reply('There was an error executing this command!');
    }
  }
};