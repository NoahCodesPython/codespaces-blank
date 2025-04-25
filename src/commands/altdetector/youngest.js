const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { AltDetector } = require('../../models/AltDetector');
const Guild = require('../../models/Guild');
const logger = require('../../utils/logger');

module.exports = {
  name: 'youngest',
  description: 'Show the youngest accounts in the server',
  category: 'altdetector',
  aliases: ['newaccounts', 'youngaccounts'],
  usage: '[count]',
  examples: ['youngest', 'youngest 10'],
  userPermissions: [PermissionFlagsBits.ManageGuild],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('youngest')
    .setDescription('Show the youngest accounts in the server')
    .addIntegerOption(option => 
      option.setName('count')
        .setDescription('Number of accounts to show (default: 10, max: 25)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(25))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  
  // Slash command execution
  async execute(interaction) {
    try {
      await interaction.deferReply();
      
      // Get options
      const count = interaction.options.getInteger('count') || 10;
      
      // Fetch all members
      await interaction.guild.members.fetch();
      
      // Calculate current time
      const now = Date.now();
      
      // Collect member data with account age
      const members = [];
      
      for (const [memberId, member] of interaction.guild.members.cache) {
        // Skip bots
        if (member.user.bot) continue;
        
        // Calculate account age
        const accountCreationTime = member.user.createdTimestamp;
        const accountAge = now - accountCreationTime;
        const ageInDays = Math.floor(accountAge / (24 * 60 * 60 * 1000));
        
        members.push({
          member,
          accountCreationTime,
          accountAge,
          ageInDays,
          joinedTimestamp: member.joinedTimestamp
        });
      }
      
      // Sort from youngest to oldest
      members.sort((a, b) => a.accountCreationTime - b.accountCreationTime);
      
      // Take the requested number of youngest accounts
      const youngestMembers = members.slice(0, count);
      
      // If no members found
      if (youngestMembers.length === 0) {
        return interaction.editReply('No members found in the server.');
      }
      
      // Create embed with youngest members
      const embed = new EmbedBuilder()
        .setTitle(`${count} Youngest Accounts in ${interaction.guild.name}`)
        .setColor('#3498db')
        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
        .setTimestamp();
      
      // Add fields for each member
      for (let i = 0; i < youngestMembers.length; i++) {
        const memberData = youngestMembers[i];
        embed.addFields({
          name: `${i + 1}. ${memberData.member.user.tag} (${memberData.member.id})`,
          value: `Account created: <t:${Math.floor(memberData.accountCreationTime / 1000)}:R> (${memberData.ageInDays} days old)\nJoined server: <t:${Math.floor(memberData.joinedTimestamp / 1000)}:R>`,
          inline: false
        });
      }
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing youngest command: ${error}`);
      if (interaction.deferred) {
        await interaction.editReply({ content: 'There was an error executing this command!' });
      } else {
        await interaction.reply({ 
          content: 'There was an error executing this command!', 
          ephemeral: true 
        });
      }
    }
  },
  
  // Legacy command execution
  async run(client, message, args) {
    try {
      const loadingMessage = await message.reply('Finding youngest accounts...');
      
      // Parse count argument
      let count = 10;
      if (args[0]) {
        const parsedCount = parseInt(args[0]);
        if (!isNaN(parsedCount) && parsedCount > 0) {
          count = Math.min(parsedCount, 25); // Cap at 25 to avoid hitting embed limits
        }
      }
      
      // Fetch all members
      await message.guild.members.fetch();
      
      // Calculate current time
      const now = Date.now();
      
      // Collect member data with account age
      const members = [];
      
      for (const [memberId, member] of message.guild.members.cache) {
        // Skip bots
        if (member.user.bot) continue;
        
        // Calculate account age
        const accountCreationTime = member.user.createdTimestamp;
        const accountAge = now - accountCreationTime;
        const ageInDays = Math.floor(accountAge / (24 * 60 * 60 * 1000));
        
        members.push({
          member,
          accountCreationTime,
          accountAge,
          ageInDays,
          joinedTimestamp: member.joinedTimestamp
        });
      }
      
      // Sort from youngest to oldest
      members.sort((a, b) => a.accountCreationTime - b.accountCreationTime);
      
      // Take the requested number of youngest accounts
      const youngestMembers = members.slice(0, count);
      
      // If no members found
      if (youngestMembers.length === 0) {
        return loadingMessage.edit('No members found in the server.');
      }
      
      // Create embed with youngest members
      const embed = new EmbedBuilder()
        .setTitle(`${count} Youngest Accounts in ${message.guild.name}`)
        .setColor('#3498db')
        .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTimestamp();
      
      // Add fields for each member
      for (let i = 0; i < youngestMembers.length; i++) {
        const memberData = youngestMembers[i];
        embed.addFields({
          name: `${i + 1}. ${memberData.member.user.tag} (${memberData.member.id})`,
          value: `Account created: <t:${Math.floor(memberData.accountCreationTime / 1000)}:R> (${memberData.ageInDays} days old)\nJoined server: <t:${Math.floor(memberData.joinedTimestamp / 1000)}:R>`,
          inline: false
        });
      }
      
      await loadingMessage.edit({ content: ' ', embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing youngest command: ${error}`);
      message.reply('There was an error executing this command!');
    }
  }
};