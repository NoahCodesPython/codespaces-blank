const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { AltDetector, AltAccount } = require('../../models/AltDetector');
const Guild = require('../../models/Guild');
const logger = require('../../utils/logger');

module.exports = {
  name: 'identifyalts',
  description: 'Check if any members are potential alt accounts',
  category: 'altdetector',
  aliases: ['findalt', 'checkalts'],
  usage: '',
  examples: ['identifyalts'],
  userPermissions: [PermissionFlagsBits.ManageGuild],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('identifyalts')
    .setDescription('Check if any members are potential alt accounts')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  
  // Slash command execution
  async execute(interaction) {
    try {
      await interaction.deferReply();
      
      // Get alt detector settings
      const altSettings = await AltDetector.findOne({ guildID: interaction.guild.id });
      
      if (!altSettings) {
        return interaction.editReply({
          content: 'Alt detection has not been set up for this server. Use `/asetdays` and `/atoggle` to set it up.',
        });
      }
      
      // If alt detection is disabled, inform the user
      if (!altSettings.altToggle) {
        return interaction.editReply({
          content: 'Alt detection is currently disabled. Enable it with `/atoggle on`.',
        });
      }
      
      // Get the minimum account age (in days)
      const minAccountAgeDays = parseInt(altSettings.altDays) || 7;
      const minAccountAgeMs = minAccountAgeDays * 24 * 60 * 60 * 1000;
      
      // Fetch all members
      await interaction.guild.members.fetch();
      
      // Calculate current time
      const now = Date.now();
      
      // Identify potential alts
      const potentialAlts = [];
      
      for (const [memberId, member] of interaction.guild.members.cache) {
        // Skip bots
        if (member.user.bot) continue;
        
        // Skip whitelisted users
        if (altSettings.allowedAlts.includes(memberId)) continue;
        
        // Calculate account age
        const accountCreationTime = member.user.createdTimestamp;
        const accountAge = now - accountCreationTime;
        
        // Check if account is younger than the minimum age
        if (accountAge < minAccountAgeMs) {
          potentialAlts.push({
            member,
            accountCreationTime,
            accountAge,
            ageInDays: Math.floor(accountAge / (24 * 60 * 60 * 1000))
          });
          
          // Store in database
          const altData = {
            guildID: interaction.guild.id,
            userID: memberId,
            accountCreationDate: new Date(accountCreationTime),
            joinDate: new Date(member.joinedTimestamp),
            avatarURL: member.user.displayAvatarURL({ dynamic: true }),
            accountAge: accountAge,
            isAlt: true,
            altReason: `Account age below threshold (${minAccountAgeDays} days)`
          };
          
          // Update or create alt account record
          await AltAccount.findOneAndUpdate(
            { guildID: interaction.guild.id, userID: memberId },
            altData,
            { upsert: true, new: true }
          );
        }
      }
      
      // If no potential alts found
      if (potentialAlts.length === 0) {
        return interaction.editReply({
          content: `No potential alt accounts detected (account age < ${minAccountAgeDays} days).`,
        });
      }
      
      // Sort from youngest to oldest
      potentialAlts.sort((a, b) => a.accountAge - b.accountAge);
      
      // Create embed with potential alts (maximum 15 to avoid hitting embed limits)
      const embed = new EmbedBuilder()
        .setTitle('Potential Alt Accounts')
        .setDescription(`Found ${potentialAlts.length} accounts younger than ${minAccountAgeDays} days.`)
        .setColor('#FF0000')
        .setFooter({ text: `${interaction.guild.name} • Alt detection threshold: ${minAccountAgeDays} days`, iconURL: interaction.guild.iconURL({ dynamic: true }) })
        .setTimestamp();
      
      // Add fields for potential alts (max 15)
      const displayCount = Math.min(potentialAlts.length, 15);
      
      for (let i = 0; i < displayCount; i++) {
        const alt = potentialAlts[i];
        embed.addFields({
          name: `${alt.member.user.tag} (${alt.member.id})`,
          value: `Account created: <t:${Math.floor(alt.accountCreationTime / 1000)}:R> (${alt.ageInDays} days old)\nJoined server: <t:${Math.floor(alt.member.joinedTimestamp / 1000)}:R>`,
          inline: false
        });
      }
      
      if (potentialAlts.length > 15) {
        embed.addFields({
          name: `And ${potentialAlts.length - 15} more...`,
          value: 'The list was truncated to avoid hitting Discord embed limits.',
          inline: false
        });
      }
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing identifyalts command: ${error}`);
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
      const loadingMessage = await message.reply('Scanning for potential alt accounts...');
      
      // Get alt detector settings
      const altSettings = await AltDetector.findOne({ guildID: message.guild.id });
      
      if (!altSettings) {
        return loadingMessage.edit('Alt detection has not been set up for this server. Use the `asetdays` and `atoggle` commands to set it up.');
      }
      
      // If alt detection is disabled, inform the user
      if (!altSettings.altToggle) {
        return loadingMessage.edit('Alt detection is currently disabled. Enable it with the `atoggle on` command.');
      }
      
      // Get the minimum account age (in days)
      const minAccountAgeDays = parseInt(altSettings.altDays) || 7;
      const minAccountAgeMs = minAccountAgeDays * 24 * 60 * 60 * 1000;
      
      // Fetch all members
      await message.guild.members.fetch();
      
      // Calculate current time
      const now = Date.now();
      
      // Identify potential alts
      const potentialAlts = [];
      
      for (const [memberId, member] of message.guild.members.cache) {
        // Skip bots
        if (member.user.bot) continue;
        
        // Skip whitelisted users
        if (altSettings.allowedAlts.includes(memberId)) continue;
        
        // Calculate account age
        const accountCreationTime = member.user.createdTimestamp;
        const accountAge = now - accountCreationTime;
        
        // Check if account is younger than the minimum age
        if (accountAge < minAccountAgeMs) {
          potentialAlts.push({
            member,
            accountCreationTime,
            accountAge,
            ageInDays: Math.floor(accountAge / (24 * 60 * 60 * 1000))
          });
          
          // Store in database
          const altData = {
            guildID: message.guild.id,
            userID: memberId,
            accountCreationDate: new Date(accountCreationTime),
            joinDate: new Date(member.joinedTimestamp),
            avatarURL: member.user.displayAvatarURL({ dynamic: true }),
            accountAge: accountAge,
            isAlt: true,
            altReason: `Account age below threshold (${minAccountAgeDays} days)`
          };
          
          // Update or create alt account record
          await AltAccount.findOneAndUpdate(
            { guildID: message.guild.id, userID: memberId },
            altData,
            { upsert: true, new: true }
          );
        }
      }
      
      // If no potential alts found
      if (potentialAlts.length === 0) {
        return loadingMessage.edit(`No potential alt accounts detected (account age < ${minAccountAgeDays} days).`);
      }
      
      // Sort from youngest to oldest
      potentialAlts.sort((a, b) => a.accountAge - b.accountAge);
      
      // Create embed with potential alts (maximum 15 to avoid hitting embed limits)
      const embed = new EmbedBuilder()
        .setTitle('Potential Alt Accounts')
        .setDescription(`Found ${potentialAlts.length} accounts younger than ${minAccountAgeDays} days.`)
        .setColor('#FF0000')
        .setFooter({ text: `${message.guild.name} • Alt detection threshold: ${minAccountAgeDays} days`, iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTimestamp();
      
      // Add fields for potential alts (max 15)
      const displayCount = Math.min(potentialAlts.length, 15);
      
      for (let i = 0; i < displayCount; i++) {
        const alt = potentialAlts[i];
        embed.addFields({
          name: `${alt.member.user.tag} (${alt.member.id})`,
          value: `Account created: <t:${Math.floor(alt.accountCreationTime / 1000)}:R> (${alt.ageInDays} days old)\nJoined server: <t:${Math.floor(alt.member.joinedTimestamp / 1000)}:R>`,
          inline: false
        });
      }
      
      if (potentialAlts.length > 15) {
        embed.addFields({
          name: `And ${potentialAlts.length - 15} more...`,
          value: 'The list was truncated to avoid hitting Discord embed limits.',
          inline: false
        });
      }
      
      await loadingMessage.edit({ content: ' ', embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing identifyalts command: ${error}`);
      message.reply('There was an error executing this command!');
    }
  }
};