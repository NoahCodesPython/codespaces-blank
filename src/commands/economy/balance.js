const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../../models/User');
const logger = require('../../utils/logger');

module.exports = {
  name: 'balance',
  description: 'Check your or another user\'s balance',
  category: 'economy',
  aliases: ['bal', 'money', 'credits', 'wallet'],
  usage: '[user]',
  examples: ['balance', 'balance @User'],
  userPermissions: [],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Check your or another user\'s balance')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to check balance for')
        .setRequired(false)),
  
  // Slash command execution
  async execute(interaction) {
    try {
      // Get the target user, default to the command user if none specified
      const targetUser = interaction.options.getUser('user') || interaction.user;
      
      // Get user data from database
      let userData = await User.findOne({ userID: targetUser.id });
      
      if (!userData) {
        // Create new user if not found
        userData = new User({
          userID: targetUser.id,
          economy: {
            wallet: 0,
            bank: 0
          }
        });
        await userData.save();
      }
      
      // Format currency values
      const walletBalance = userData.economy.wallet.toLocaleString();
      const bankBalance = userData.economy.bank.toLocaleString();
      const totalBalance = (userData.economy.wallet + userData.economy.bank).toLocaleString();
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle(`${targetUser.id === interaction.user.id ? 'Your' : `${targetUser.username}'s`} Balance`)
        .setColor('#FFD700') // Gold color
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: '💵 Wallet', value: `$${walletBalance}`, inline: true },
          { name: '🏦 Bank', value: `$${bankBalance}`, inline: true },
          { name: '💰 Total', value: `$${totalBalance}`, inline: true }
        )
        .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing balance command: ${error}`);
      await interaction.reply({ 
        content: 'There was an error executing this command!', 
        ephemeral: true 
      });
    }
  },
  
  // Legacy command execution
  async run(client, message, args) {
    try {
      // Get the target user
      let targetUser;
      if (args.length > 0) {
        // Try to get user from mention or ID
        targetUser = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null);
      }
      if (!targetUser) targetUser = message.author;
      
      // Get user data from database
      let userData = await User.findOne({ userID: targetUser.id });
      
      if (!userData) {
        // Create new user if not found
        userData = new User({
          userID: targetUser.id,
          economy: {
            wallet: 0,
            bank: 0
          }
        });
        await userData.save();
      }
      
      // Format currency values
      const walletBalance = userData.economy.wallet.toLocaleString();
      const bankBalance = userData.economy.bank.toLocaleString();
      const totalBalance = (userData.economy.wallet + userData.economy.bank).toLocaleString();
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle(`${targetUser.id === message.author.id ? 'Your' : `${targetUser.username}'s`} Balance`)
        .setColor('#FFD700') // Gold color
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: '💵 Wallet', value: `$${walletBalance}`, inline: true },
          { name: '🏦 Bank', value: `$${bankBalance}`, inline: true },
          { name: '💰 Total', value: `$${totalBalance}`, inline: true }
        )
        .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      
      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing balance command: ${error}`);
      message.reply('There was an error executing this command!');
    }
  }
};