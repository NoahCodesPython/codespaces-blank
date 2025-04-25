const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Guild = require('../../models/Guild');
const ms = require('ms');
const logger = require('../../utils/logger');

module.exports = {
  name: 'timeout',
  description: 'Timeout/mute a user for a specified duration',
  category: 'moderation',
  aliases: ['mute', 'tempmute'],
  usage: '<user> <duration> [reason]',
  examples: ['timeout @User 1h Stop spamming'],
  userPermissions: [PermissionFlagsBits.ModerateMembers],
  botPermissions: [PermissionFlagsBits.ModerateMembers],
  
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout a user')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to timeout')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('duration')
        .setDescription('Timeout duration (e.g., 1h, 30m, 1d)')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('The reason for the timeout')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  
  // Slash command execution
  async execute(client, interaction) {
    try {
      // Get options
      const targetUser = interaction.options.getUser('user');
      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      const durationString = interaction.options.getString('duration');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      
      // Parse duration
      const durationRegex = /^(\d+)(s|m|h|d|w)$/;
      if (!durationRegex.test(durationString)) {
        return interaction.reply({ 
          content: 'Please provide a valid duration (e.g., 1s, 30m, 1h, 1d, 1w)', 
          ephemeral: true 
        });
      }
      
      const durationMs = ms(durationString);
      if (durationMs < 5000 || durationMs > 2419200000) { // Between 5s and 28 days
        return interaction.reply({ 
          content: 'Timeout duration must be between 5 seconds and 28 days', 
          ephemeral: true 
        });
      }
      
      // Initial checks
      if (!targetMember) {
        return interaction.reply({ 
          content: 'This user is not in the server!', 
          ephemeral: true 
        });
      }
      
      if (targetUser.id === interaction.user.id) {
        return interaction.reply({ 
          content: 'You cannot timeout yourself!', 
          ephemeral: true 
        });
      }
      
      if (targetMember.roles.highest.position >= interaction.member.roles.highest.position && 
          interaction.member.id !== interaction.guild.ownerId) {
        return interaction.reply({ 
          content: 'You cannot timeout this user as they have a higher or equal role to you!', 
          ephemeral: true 
        });
      }
      
      if (!targetMember.moderatable) {
        return interaction.reply({ 
          content: 'I cannot timeout this user! Make sure my role is above theirs.', 
          ephemeral: true 
        });
      }
      
      // Apply timeout
      await targetMember.timeout(durationMs, `${reason} / Responsible user: ${interaction.user.tag}`);
      
      // Create and send response embed
      const successEmbed = new EmbedBuilder()
        .setDescription(`✅ **${targetUser.tag}** has been timed out for **${durationString}**.${reason !== 'No reason provided' ? `\n\n**Reason:** ${reason}` : ''}`)
        .setColor('#00FF00')
        .setTimestamp();
      
      await interaction.reply({ embeds: [successEmbed] });
      
      // Try to DM the user
      try {
        const dmEmbed = new EmbedBuilder()
          .setTitle('You have been timed out')
          .setDescription(`You have been timed out in **${interaction.guild.name}** for **${durationString}**`)
          .addFields({ name: 'Reason', value: reason })
          .addFields({ name: 'Moderator', value: `${interaction.user.tag}` })
          .setColor('#FF0000')
          .setTimestamp();
        
        await targetUser.send({ embeds: [dmEmbed] }).catch(() => {});
      } catch (error) {
        // Silently fail if DM can't be sent
      }
      
    } catch (error) {
      logger.error(`Error executing timeout command: ${error}`);
      await interaction.reply({ 
        content: 'There was an error executing this command!', 
        ephemeral: true 
      });
    }
  },
  
  // Legacy command execution
  async run(client, message, args) {
    try {
      // Get guild data from database
      const guildData = await Guild.findOne({ guildId: message.guild.id });
      
      // Get the member to timeout
      const mentionedMember = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
      
      // Initial checks
      if (!mentionedMember) {
        return message.reply('Please specify a valid member to timeout!');
      }
      
      if (mentionedMember.id === message.author.id) {
        return message.reply('You cannot timeout yourself!');
      }
      
      // Check for duration argument
      if (!args[1]) {
        return message.reply('Please specify a timeout duration (e.g., 1h, 30m, 1d)!');
      }
      
      // Parse duration
      const durationRegex = /^(\d+)(s|m|h|d|w)$/;
      if (!durationRegex.test(args[1])) {
        return message.reply('Please provide a valid duration (e.g., 1s, 30m, 1h, 1d, 1w)!');
      }
      
      const durationMs = ms(args[1]);
      if (durationMs < 5000 || durationMs > 2419200000) { // Between 5s and 28 days
        return message.reply('Timeout duration must be between 5 seconds and 28 days!');
      }
      
      if (mentionedMember.roles.highest.position >= message.member.roles.highest.position && 
          message.member.id !== message.guild.ownerId) {
        return message.reply('You cannot timeout this user as they have a higher or equal role to you!');
      }
      
      if (!mentionedMember.moderatable) {
        return message.reply('I cannot timeout this user! Make sure my role is above theirs.');
      }
      
      // Get reason
      let reason = args.slice(2).join(' ');
      if (!reason) reason = 'No reason provided';
      if (reason.length > 1024) reason = reason.slice(0, 1021) + '...';
      
      // Apply timeout
      await mentionedMember.timeout(durationMs, `${reason} / Responsible user: ${message.author.tag}`);
      
      // Create and send response embed
      const successEmbed = new EmbedBuilder()
        .setDescription(`✅ **${mentionedMember.user.tag}** has been timed out for **${args[1]}**.${reason !== 'No reason provided' ? `\n\n**Reason:** ${reason}` : ''}`)
        .setColor('#00FF00')
        .setTimestamp();
      
      await message.channel.send({ embeds: [successEmbed] });
      
      // Try to DM the user
      try {
        const dmEmbed = new EmbedBuilder()
          .setTitle('You have been timed out')
          .setDescription(`You have been timed out in **${message.guild.name}** for **${args[1]}**`)
          .addFields({ name: 'Reason', value: reason })
          .addFields({ name: 'Moderator', value: `${message.author.tag}` })
          .setColor('#FF0000')
          .setTimestamp();
        
        await mentionedMember.user.send({ embeds: [dmEmbed] }).catch(() => {});
      } catch (error) {
        // Silently fail if DM can't be sent
      }
      
    } catch (error) {
      logger.error(`Error executing timeout command: ${error}`);
      await message.channel.send('There was an error executing this command!');
    }
  }
};