const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Guild = require('../../models/Guild');
const logger = require('../../utils/logger');

module.exports = {
  name: 'ban',
  description: 'Bans the specified user from your Discord server',
  category: 'moderation',
  aliases: ['b'],
  usage: '<user> [reason]',
  examples: ['ban @User Breaking the rules!'],
  userPermissions: [PermissionFlagsBits.BanMembers],
  botPermissions: [PermissionFlagsBits.BanMembers],
  
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bans a user from the server')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to ban')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('The reason for banning the user')
        .setRequired(false))
    .addNumberOption(option => 
      option.setName('days')
        .setDescription('Number of days of messages to delete (0-7)')
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  
  // Slash command execution
  async execute(client, interaction) {
    try {
      // Get options
      const targetUser = interaction.options.getUser('user');
      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      const reason = interaction.options.getString('reason') || 'No reason provided';
      const days = interaction.options.getNumber('days') || 0;
      
      // Check if target user is the same as the one who issued the command
      if (targetUser.id === interaction.user.id) {
        return interaction.reply({ 
          content: 'You cannot ban yourself!', 
          ephemeral: true 
        });
      }
      
      // If the user is in the guild, perform additional checks
      if (targetMember) {
        // Check if target has higher role
        if (targetMember.roles.highest.position >= interaction.member.roles.highest.position && 
            interaction.member.id !== interaction.guild.ownerId) {
          return interaction.reply({ 
            content: 'You cannot ban this user as they have a higher or equal role to you!', 
            ephemeral: true 
          });
        }
        
        // Check if target is bannable
        if (!targetMember.bannable) {
          return interaction.reply({ 
            content: 'I cannot ban this user! Make sure my role is above theirs.', 
            ephemeral: true 
          });
        }
        
        // Try to DM the user before banning
        try {
          const dmEmbed = new EmbedBuilder()
            .setTitle('You have been banned')
            .setDescription(`You have been banned from **${interaction.guild.name}**`)
            .addFields({ name: 'Reason', value: reason })
            .addFields({ name: 'Moderator', value: `${interaction.user.tag}` })
            .setColor('#FF0000')
            .setTimestamp();
          
          await targetUser.send({ embeds: [dmEmbed] }).catch(() => {});
        } catch (error) {
          // Silently fail if DM can't be sent
        }
      }
      
      // Ban the user
      await interaction.guild.members.ban(targetUser.id, { 
        deleteMessageDays: days,
        reason: `${reason} / Responsible user: ${interaction.user.tag}`
      });
      
      // Create and send response embed
      const successEmbed = new EmbedBuilder()
        .setDescription(`✅ **${targetUser.tag}** has been banned.${reason !== 'No reason provided' ? `\n\n**Reason:** ${reason}` : ''}`)
        .setColor('#00FF00')
        .setTimestamp();
      
      await interaction.reply({ embeds: [successEmbed] });
      
    } catch (error) {
      logger.error(`Error executing ban command: ${error}`);
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
      
      // No user ID or mention provided
      if (!args[0]) {
        return message.reply('Please specify a user to ban!');
      }
      
      // Try to get member from mention or ID
      let targetUser = message.mentions.users.first();
      let targetMember = message.mentions.members.first();
      
      // If no mention, try to find by ID
      if (!targetUser) {
        try {
          targetUser = await client.users.fetch(args[0]);
          targetMember = await message.guild.members.fetch(args[0]).catch(() => null);
        } catch (error) {
          return message.reply('Please specify a valid user to ban!');
        }
      }
      
      // Check if target user is the same as the one who issued the command
      if (targetUser.id === message.author.id) {
        return message.reply('You cannot ban yourself!');
      }
      
      // Get reason
      let reason = args.slice(1).join(' ');
      if (!reason) reason = 'No reason provided';
      if (reason.length > 1024) reason = reason.slice(0, 1021) + '...';
      
      // If the user is in the guild, perform additional checks
      if (targetMember) {
        // Check if target has higher role
        if (targetMember.roles.highest.position >= message.member.roles.highest.position && 
            message.member.id !== message.guild.ownerId) {
          return message.reply('You cannot ban this user as they have a higher or equal role to you!');
        }
        
        // Check if target is bannable
        if (!targetMember.bannable) {
          return message.reply('I cannot ban this user! Make sure my role is above theirs.');
        }
        
        // Try to DM the user before banning
        try {
          const dmEmbed = new EmbedBuilder()
            .setTitle('You have been banned')
            .setDescription(`You have been banned from **${message.guild.name}**`)
            .addFields({ name: 'Reason', value: reason })
            .addFields({ name: 'Moderator', value: `${message.author.tag}` })
            .setColor('#FF0000')
            .setTimestamp();
          
          await targetUser.send({ embeds: [dmEmbed] }).catch(() => {});
        } catch (error) {
          // Silently fail if DM can't be sent
        }
      }
      
      // Ban the user
      await message.guild.members.ban(targetUser.id, { 
        deleteMessageDays: 1,
        reason: `${reason} / Responsible user: ${message.author.tag}`
      });
      
      // Create and send response embed
      const successEmbed = new EmbedBuilder()
        .setDescription(`✅ **${targetUser.tag}** has been banned.${reason !== 'No reason provided' ? `\n\n**Reason:** ${reason}` : ''}`)
        .setColor('#00FF00')
        .setTimestamp();
      
      await message.channel.send({ embeds: [successEmbed] });
      
    } catch (error) {
      logger.error(`Error executing ban command: ${error}`);
      await message.channel.send('There was an error executing this command!');
    }
  }
};