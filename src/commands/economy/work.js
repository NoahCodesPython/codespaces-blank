const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const User = require('../../models/User');
const logger = require('../../utils/logger');
const ms = require('ms');

// Work cooldown period (1 hour)
const COOLDOWN = 60 * 60 * 1000;

// Work jobs and messages
const jobs = [
  { name: 'Developer', messages: ['You fixed a critical bug in a software application', 'You developed a new feature for a mobile app', 'You optimized the database queries for a website'] },
  { name: 'Teacher', messages: ['You taught a class of students', 'You graded a stack of papers', 'You organized a field trip for the students'] },
  { name: 'Doctor', messages: ['You performed a successful surgery', 'You diagnosed a rare disease', 'You treated patients in the emergency room'] },
  { name: 'Chef', messages: ['You prepared a gourmet meal', 'You created a new recipe', 'You catered a large event'] },
  { name: 'Artist', messages: ['You painted a beautiful landscape', 'You sold one of your sculptures', 'You were commissioned for a custom piece'] },
  { name: 'Mechanic', messages: ['You repaired a broken engine', 'You replaced worn-out brake pads', 'You performed routine maintenance on a vehicle'] },
  { name: 'Streamer', messages: ['You hosted a successful live stream', 'You received donations during your stream', 'You gained new subscribers from your gameplay'] },
  { name: 'Writer', messages: ['You finished a chapter of your novel', 'You wrote an article for a magazine', 'You published a blog post that went viral'] },
  { name: 'Musician', messages: ['You performed at a local venue', 'You composed a new song', 'You recorded a track in the studio'] },
  { name: 'Gardener', messages: ['You landscaped a beautiful garden', 'You planted new flowers and trees', 'You maintained a public park'] }
];

module.exports = {
  name: 'work',
  description: 'Work to earn some money',
  category: 'economy',
  aliases: ['job', 'earn'],
  usage: '',
  examples: ['work'],
  userPermissions: [],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('work')
    .setDescription('Work to earn some money'),
  
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
      
      // Check if user can work
      const lastWork = userData.economy.lastWork;
      const now = new Date();
      
      if (lastWork && (now - new Date(lastWork) < COOLDOWN)) {
        // Calculate time remaining
        const timeLeft = COOLDOWN - (now - new Date(lastWork));
        const timeLeftString = ms(timeLeft, { long: true });
        
        // Create embed
        const embed = new EmbedBuilder()
          .setTitle('Work - Cooldown')
          .setDescription(`You need to rest before working again. You can work again in **${timeLeftString}**.`)
          .setColor('#FF0000')
          .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
          .setTimestamp();
        
        return interaction.reply({ embeds: [embed] });
      }
      
      // Select a random job and message
      const job = jobs[Math.floor(Math.random() * jobs.length)];
      const jobName = job.name;
      const message = job.messages[Math.floor(Math.random() * job.messages.length)];
      
      // Calculate random payout (between $100 and $500)
      const payout = Math.floor(Math.random() * 401) + 100;
      
      // Update user's wallet and last work timestamp
      userData.economy.wallet += payout;
      userData.economy.lastWork = now;
      await userData.save();
      
      // Create success embed
      const embed = new EmbedBuilder()
        .setTitle(`Work - ${jobName}`)
        .setDescription(`${message} and earned **$${payout.toLocaleString()}**.`)
        .setColor('#00FF00')
        .addFields(
          { name: '💵 New Balance', value: `$${userData.economy.wallet.toLocaleString()}`, inline: true }
        )
        .setFooter({ text: 'You can work again in 1 hour', iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing work command: ${error}`);
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
      
      // Check if user can work
      const lastWork = userData.economy.lastWork;
      const now = new Date();
      
      if (lastWork && (now - new Date(lastWork) < COOLDOWN)) {
        // Calculate time remaining
        const timeLeft = COOLDOWN - (now - new Date(lastWork));
        const timeLeftString = ms(timeLeft, { long: true });
        
        // Create embed
        const embed = new EmbedBuilder()
          .setTitle('Work - Cooldown')
          .setDescription(`You need to rest before working again. You can work again in **${timeLeftString}**.`)
          .setColor('#FF0000')
          .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
          .setTimestamp();
        
        return message.reply({ embeds: [embed] });
      }
      
      // Select a random job and message
      const job = jobs[Math.floor(Math.random() * jobs.length)];
      const jobName = job.name;
      const jobMessage = job.messages[Math.floor(Math.random() * job.messages.length)];
      
      // Calculate random payout (between $100 and $500)
      const payout = Math.floor(Math.random() * 401) + 100;
      
      // Update user's wallet and last work timestamp
      userData.economy.wallet += payout;
      userData.economy.lastWork = now;
      await userData.save();
      
      // Create success embed
      const embed = new EmbedBuilder()
        .setTitle(`Work - ${jobName}`)
        .setDescription(`${jobMessage} and earned **$${payout.toLocaleString()}**.`)
        .setColor('#00FF00')
        .addFields(
          { name: '💵 New Balance', value: `$${userData.economy.wallet.toLocaleString()}`, inline: true }
        )
        .setFooter({ text: 'You can work again in 1 hour', iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      
      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing work command: ${error}`);
      message.reply('There was an error executing this command!');
    }
  }
};