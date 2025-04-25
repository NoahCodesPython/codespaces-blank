const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Reminder = require('../../models/Reminder');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');

/**
 * Parse a time string into milliseconds
 * @param {string} timeString - The time string (e.g., "1h", "30m", "1d12h")
 * @returns {number} The time in milliseconds
 */
function parseTime(timeString) {
  let totalMs = 0;
  const regex = /(\d+)([hmdw])/g;
  let match;
  
  while ((match = regex.exec(timeString)) !== null) {
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 'm': // minutes
        totalMs += value * 60 * 1000;
        break;
      case 'h': // hours
        totalMs += value * 60 * 60 * 1000;
        break;
      case 'd': // days
        totalMs += value * 24 * 60 * 60 * 1000;
        break;
      case 'w': // weeks
        totalMs += value * 7 * 24 * 60 * 60 * 1000;
        break;
    }
  }
  
  return totalMs;
}

/**
 * Format milliseconds into a readable time string
 * @param {number} ms - The time in milliseconds
 * @returns {string} The formatted time string
 */
function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ${hours % 24} hour${hours % 24 !== 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes % 60} minute${minutes % 60 !== 1 ? 's' : ''}`;
  } else {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
}

module.exports = {
  name: 'remind',
  description: 'Set a reminder',
  category: 'utility',
  aliases: ['remindme', 'reminder'],
  usage: '<time> <reminder>',
  examples: ['remind 1h Take the pizza out of the oven', 'remind 30m Call mom', 'remind 1d12h Check project status'],
  userPermissions: [],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('remind')
    .setDescription('Set a reminder')
    .addStringOption(option => 
      option.setName('time')
        .setDescription('When to remind you (e.g., 1h, 30m, 1d12h)')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('reminder')
        .setDescription('What to remind you about')
        .setRequired(true)),
  
  // Slash command execution
  async execute(interaction) {
    try {
      const timeString = interaction.options.getString('time');
      const reminderText = interaction.options.getString('reminder');
      
      // Parse the time
      const timeMs = parseTime(timeString);
      
      if (timeMs === 0) {
        return interaction.reply({
          content: 'Invalid time format. Use combinations like 30m, 1h, 1d12h, etc.',
          ephemeral: true
        });
      }
      
      if (timeMs > 2147483647) { // ~24.8 days
        return interaction.reply({
          content: 'Reminder time is too far in the future. Maximum time is 24 days.',
          ephemeral: true
        });
      }
      
      // Calculate the reminder time
      const reminderTime = new Date(Date.now() + timeMs);
      
      // Create a unique ID for this reminder
      const reminderID = uuidv4();
      
      // Save the reminder to database
      const reminder = new Reminder({
        userID: interaction.user.id,
        channelID: interaction.channel.id,
        guildID: interaction.guild.id,
        reminder: reminderText,
        reminderID,
        time: reminderTime
      });
      
      await reminder.save();
      
      // Confirm to the user
      const embed = new EmbedBuilder()
        .setTitle('⏰ Reminder Set')
        .setDescription(`I'll remind you in **${formatTime(timeMs)}**:\n${reminderText}`)
        .setColor('#0099ff')
        .setFooter({ text: `Reminder ID: ${reminderID.substring(0, 8)}` })
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error in remind command: ${error}`);
      interaction.reply({ 
        content: 'There was an error setting your reminder!', 
        ephemeral: true 
      });
    }
  },
  
  // Legacy command execution
  async run(client, message, args) {
    try {
      if (args.length < 2) {
        return message.reply('Please provide a time and a reminder message. Example: `remind 1h Take the pizza out of the oven`');
      }
      
      const timeString = args[0].toLowerCase();
      const reminderText = args.slice(1).join(' ');
      
      // Parse the time
      const timeMs = parseTime(timeString);
      
      if (timeMs === 0) {
        return message.reply('Invalid time format. Use combinations like 30m, 1h, 1d12h, etc.');
      }
      
      if (timeMs > 2147483647) { // ~24.8 days
        return message.reply('Reminder time is too far in the future. Maximum time is 24 days.');
      }
      
      // Calculate the reminder time
      const reminderTime = new Date(Date.now() + timeMs);
      
      // Create a unique ID for this reminder
      const reminderID = uuidv4();
      
      // Save the reminder to database
      const reminder = new Reminder({
        userID: message.author.id,
        channelID: message.channel.id,
        guildID: message.guild.id,
        reminder: reminderText,
        reminderID,
        time: reminderTime
      });
      
      await reminder.save();
      
      // Confirm to the user
      const embed = new EmbedBuilder()
        .setTitle('⏰ Reminder Set')
        .setDescription(`I'll remind you in **${formatTime(timeMs)}**:\n${reminderText}`)
        .setColor('#0099ff')
        .setFooter({ text: `Reminder ID: ${reminderID.substring(0, 8)}` })
        .setTimestamp();
      
      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error in legacy remind command: ${error}`);
      message.reply('There was an error setting your reminder!');
    }
  }
};