const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const AFK = require('../../models/AFK');
const logger = require('../../utils/logger');

module.exports = {
  name: 'afk',
  description: 'Set your AFK status with an optional reason',
  category: 'config',
  aliases: [],
  usage: '[reason]',
  examples: ['afk', 'afk Gone for lunch'],
  cooldown: 20,
  
  data: new SlashCommandBuilder()
    .setName('afk')
    .setDescription('Set your AFK status with an optional reason')
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('The reason you are AFK')
        .setRequired(false)),
  
  // Slash command execution
  async execute(interaction) {
    try {
      // Get reason from options
      const reason = interaction.options.getString('reason') || 'AFK';
      
      // Check for mentions
      if (reason.includes('@everyone') || reason.includes('@here')) {
        return interaction.reply({ 
          content: 'You cannot use mentions in your AFK message!', 
          ephemeral: true 
        });
      }
      
      // Check reason length
      if (reason.length > 100) {
        return interaction.reply({ 
          content: 'Your AFK reason must be 100 characters or less!', 
          ephemeral: true 
        });
      }
      
      // Get the user's current nickname or username
      const member = interaction.member;
      const oldNickname = member.nickname || interaction.user.username;
      const newNickname = `[AFK] ${oldNickname}`;
      
      // Try to set the new nickname
      await member.setNickname(newNickname).catch(() => {
        logger.warn(`Failed to update nickname for ${interaction.user.tag} due to permissions`);
        // We'll continue even if we can't set the nickname
      });
      
      // Check if the user is already AFK
      const existingAFK = await AFK.findOne({ 
        userID: interaction.user.id,
        serverID: interaction.guild.id
      });
      
      if (existingAFK) {
        // Update the existing AFK status
        await existingAFK.updateOne({
          reason: reason,
          time: new Date()
        });
      } else {
        // Create a new AFK entry
        const newAFK = new AFK({
          userID: interaction.user.id,
          serverID: interaction.guild.id,
          reason: reason,
          oldNickname: oldNickname,
          time: new Date()
        });
        
        await newAFK.save();
      }
      
      // Create an embed response
      const embed = new EmbedBuilder()
        .setDescription(`I've set your AFK status: ${reason}`)
        .setColor('#0099ff')
        .setAuthor({ 
          name: interaction.user.tag, 
          iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
        })
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error in AFK command: ${error}`);
      await interaction.reply({ 
        content: 'There was an error setting your AFK status. Please try again.', 
        ephemeral: true 
      });
    }
  },
  
  // Legacy command execution
  async run(client, message, args) {
    try {
      // Check for mentions
      if (message.mentions.users.size > 0) {
        return message.reply('You cannot mention users in your AFK message!');
      }
      
      const reason = args.join(' ') || 'AFK';
      
      // Check for mentions
      if (reason.includes('@everyone') || reason.includes('@here')) {
        return message.reply('You cannot use mentions in your AFK message!');
      }
      
      // Check reason length
      if (reason.length > 100) {
        return message.reply('Your AFK reason must be 100 characters or less!');
      }
      
      // Get the user's current nickname or username
      const member = message.member;
      const oldNickname = member.nickname || message.author.username;
      const newNickname = `[AFK] ${oldNickname}`;
      
      // Try to set the new nickname
      await member.setNickname(newNickname).catch(() => {
        logger.warn(`Failed to update nickname for ${message.author.tag} due to permissions`);
        // We'll continue even if we can't set the nickname
      });
      
      // Check if the user is already AFK
      const existingAFK = await AFK.findOne({ 
        userID: message.author.id,
        serverID: message.guild.id
      });
      
      if (existingAFK) {
        // Update the existing AFK status
        await existingAFK.updateOne({
          reason: reason,
          time: new Date()
        });
      } else {
        // Create a new AFK entry
        const newAFK = new AFK({
          userID: message.author.id,
          serverID: message.guild.id,
          reason: reason,
          oldNickname: oldNickname,
          time: new Date()
        });
        
        await newAFK.save();
      }
      
      // Create an embed response
      const embed = new EmbedBuilder()
        .setDescription(`I've set your AFK status: ${reason}`)
        .setColor('#0099ff')
        .setAuthor({ 
          name: message.author.tag, 
          iconURL: message.author.displayAvatarURL({ dynamic: true }) 
        })
        .setTimestamp();
      
      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error in AFK command: ${error}`);
      message.reply('There was an error setting your AFK status. Please try again.');
    }
  }
};