const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Guild = require('../../models/Guild');
const logger = require('../../utils/logger');

module.exports = {
  name: 'kick',
  description: 'Kicks the specified user from your Discord server',
  category: 'moderation',
  aliases: ['k'],
  usage: '<user> [reason]',
  examples: ['kick @User Breaking the rules'],
  userPermissions: [PermissionFlagsBits.KickMembers],
  botPermissions: [PermissionFlagsBits.KickMembers],
  
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kicks a user from the server')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to kick')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('The reason for kicking the user')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  
  // Slash command execution
  async execute(interaction) {
    try {
      // Get options
      const targetUser = interaction.options.getUser('user');
      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      const reason = interaction.options.getString('reason') || 'No reason provided';
      
      // Initial checks
      if (!targetMember) {
        return interaction.reply({ 
          content: 'This user is not in the server!', 
          ephemeral: true 
        });
      }
      
      if (targetUser.id === interaction.user.id) {
        return interaction.reply({ 
          content: 'You cannot kick yourself!', 
          ephemeral: true 
        });
      }
      
      if (targetMember.roles.highest.position >= interaction.member.roles.highest.position && interaction.member.id !== interaction.guild.ownerId) {
        return interaction.reply({ 
          content: 'You cannot kick this user as they have a higher or equal role to you!', 
          ephemeral: true 
        });
      }
      
      if (!targetMember.kickable) {
        return interaction.reply({ 
          content: 'I cannot kick this user! Make sure my role is above theirs.', 
          ephemeral: true 
        });
      }
      
      // Kick the user
      await targetMember.kick(`${reason} / Responsible user: ${interaction.user.tag}`);
      
      // Create and send response embed
      const successEmbed = new EmbedBuilder()
        .setDescription(`✅ **${targetUser.tag}** has been kicked.${reason !== 'No reason provided' ? `\n\n**Reason:** ${reason}` : ''}`)
        .setColor('#00FF00')
        .setTimestamp();
      
      await interaction.reply({ embeds: [successEmbed] });
      
      // Try to DM the user
      try {
        const dmEmbed = new EmbedBuilder()
          .setTitle('You have been kicked')
          .setDescription(`You have been kicked from **${interaction.guild.name}**`)
          .addFields({ name: 'Reason', value: reason })
          .addFields({ name: 'Moderator', value: `${interaction.user.tag}` })
          .setColor('#FF0000')
          .setTimestamp();
        
        await targetUser.send({ embeds: [dmEmbed] }).catch(() => {});
      } catch (error) {
        // Silently fail if DM can't be sent
      }
      
    } catch (error) {
      logger.error(`Error executing kick command: ${error}`);
      await interaction.reply({ 
        content: 'There was an error executing this command!', 
        ephemeral: true 
      });
    }
  },
  
  // Legacy command execution
  async run(message, args, client) {
    try {
      // Get guild data from database
      const guildData = await Guild.findOne({ guildId: message.guild.id });
      
      // Get the member to kick
      const memberTarget = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
      
      // Initial checks
      if (!memberTarget) {
        return message.reply('Please specify a valid member to kick!');
      }
      
      if (memberTarget.id === message.author.id) {
        return message.reply('You cannot kick yourself!');
      }
      
      if (memberTarget.roles.highest.position >= message.member.roles.highest.position && message.member.id !== message.guild.ownerId) {
        return message.reply('You cannot kick this user as they have a higher or equal role to you!');
      }
      
      if (!memberTarget.kickable) {
        return message.reply('I cannot kick this user! Make sure my role is above theirs.');
      }
      
      // Get reason
      let reason = args.slice(1).join(' ');
      if (!reason) reason = 'No reason provided';
      if (reason.length > 1024) reason = reason.slice(0, 1021) + '...';
      
      // Kick the user
      await memberTarget.kick(`${reason} / Responsible user: ${message.author.tag}`);
      
      // Create and send response embed
      const successEmbed = new EmbedBuilder()
        .setDescription(`✅ **${memberTarget.user.tag}** has been kicked.${reason !== 'No reason provided' ? `\n\n**Reason:** ${reason}` : ''}`)
        .setColor('#00FF00')
        .setTimestamp();
      
      await message.channel.send({ embeds: [successEmbed] });
      
      // Try to DM the user
      try {
        const dmEmbed = new EmbedBuilder()
          .setTitle('You have been kicked')
          .setDescription(`You have been kicked from **${message.guild.name}**`)
          .addFields({ name: 'Reason', value: reason })
          .addFields({ name: 'Moderator', value: `${message.author.tag}` })
          .setColor('#FF0000')
          .setTimestamp();
        
        await memberTarget.user.send({ embeds: [dmEmbed] }).catch(() => {});
      } catch (error) {
        // Silently fail if DM can't be sent
      }
      
    } catch (error) {
      logger.error(`Error executing kick command: ${error}`);
      await message.channel.send('There was an error executing this command!');
    }
  }
};