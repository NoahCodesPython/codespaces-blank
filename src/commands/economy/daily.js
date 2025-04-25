const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../../models/User');
const logger = require('../../utils/logger');
const ms = require('ms');

// Daily reward amount
const DAILY_AMOUNT = 1000;
// Cooldown period (24 hours)
const COOLDOWN = 24 * 60 * 60 * 1000;

module.exports = {
  name: 'daily',
  description: 'Claim your daily rewards',
  category: 'economy',
  aliases: ['dailyreward', 'dailybonus'],
  usage: '',
  examples: ['daily'],
  userPermissions: [],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim your daily rewards'),
  
  // Slash command execution
  async execute(interaction) {
    try {
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
      }
      
      // Check if user can claim daily reward
      const lastDaily = userData.economy.lastDaily;
      const now = new Date();
      
      if (lastDaily && (now - new Date(lastDaily) < COOLDOWN)) {
        // Calculate time remaining
        const timeLeft = COOLDOWN - (now - new Date(lastDaily));
        const timeLeftString = ms(timeLeft, { long: true });
        
        // Create embed
        const embed = new EmbedBuilder()
          .setTitle('Daily Reward - Cooldown')
          .setDescription(`You have already claimed your daily reward. Please try again in **${timeLeftString}**.`)
          .setColor('#FF0000')
          .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
          .setTimestamp();
        
        return interaction.reply({ embeds: [embed] });
      }
      
      // Update user's wallet and last daily timestamp
      userData.economy.wallet += DAILY_AMOUNT;
      userData.economy.lastDaily = now;
      await userData.save();
      
      // Create success embed
      const embed = new EmbedBuilder()
        .setTitle('Daily Reward Claimed')
        .setDescription(`You have claimed your daily reward of **$${DAILY_AMOUNT.toLocaleString()}**!`)
        .setColor('#00FF00')
        .addFields(
          { name: '💵 New Balance', value: `$${userData.economy.wallet.toLocaleString()}`, inline: true }
        )
        .setFooter({ text: 'Come back tomorrow for more rewards!', iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing daily command: ${error}`);
      await interaction.reply({ 
        content: 'There was an error executing this command!', 
        ephemeral: true 
      });
    }
  },
  
  // Legacy command execution
  async run(client, message, args) {
    try {
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
      }
      
      // Check if user can claim daily reward
      const lastDaily = userData.economy.lastDaily;
      const now = new Date();
      
      if (lastDaily && (now - new Date(lastDaily) < COOLDOWN)) {
        // Calculate time remaining
        const timeLeft = COOLDOWN - (now - new Date(lastDaily));
        const timeLeftString = ms(timeLeft, { long: true });
        
        // Create embed
        const embed = new EmbedBuilder()
          .setTitle('Daily Reward - Cooldown')
          .setDescription(`You have already claimed your daily reward. Please try again in **${timeLeftString}**.`)
          .setColor('#FF0000')
          .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
          .setTimestamp();
        
        return message.reply({ embeds: [embed] });
      }
      
      // Update user's wallet and last daily timestamp
      userData.economy.wallet += DAILY_AMOUNT;
      userData.economy.lastDaily = now;
      await userData.save();
      
      // Create success embed
      const embed = new EmbedBuilder()
        .setTitle('Daily Reward Claimed')
        .setDescription(`You have claimed your daily reward of **$${DAILY_AMOUNT.toLocaleString()}**!`)
        .setColor('#00FF00')
        .addFields(
          { name: '💵 New Balance', value: `$${userData.economy.wallet.toLocaleString()}`, inline: true }
        )
        .setFooter({ text: 'Come back tomorrow for more rewards!', iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      
      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing daily command: ${error}`);
      message.reply('There was an error executing this command!');
    }
  }
};