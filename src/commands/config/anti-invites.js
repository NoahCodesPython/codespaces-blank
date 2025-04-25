const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Guild = require('../../models/Guild');
const logger = require('../../utils/logger');

module.exports = {
  name: 'anti-invites',
  description: 'Enable or disable the Discord invite link filter',
  category: 'config',
  aliases: ['antiinvites', 'invite-filter'],
  usage: '<enable/disable>',
  examples: ['anti-invites enable', 'anti-invites disable'],
  userPermissions: [PermissionFlagsBits.ManageGuild],
  botPermissions: [PermissionFlagsBits.ManageMessages],
  
  data: new SlashCommandBuilder()
    .setName('anti-invites')
    .setDescription('Enable or disable the Discord invite link filter')
    .addStringOption(option =>
      option.setName('action')
        .setDescription('Whether to enable or disable the filter')
        .setRequired(true)
        .addChoices(
          { name: 'Enable', value: 'enable' },
          { name: 'Disable', value: 'disable' }
        ))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  
  // Slash command execution
  async execute(interaction) {
    try {
      // Get the action option
      const action = interaction.options.getString('action');
      const enable = action === 'enable';
      
      // Find the guild settings
      let guildSettings = await Guild.findOne({ guildID: interaction.guild.id });
      
      // Create settings if they don't exist
      if (!guildSettings) {
        guildSettings = new Guild({
          guildID: interaction.guild.id,
          antiInvites: enable
        });
        
        await guildSettings.save();
      } else {
        // Update the settings
        await Guild.updateOne(
          { guildID: interaction.guild.id },
          { antiInvites: enable }
        );
      }
      
      // Create response embed
      const embed = new EmbedBuilder()
        .setTitle('Anti-Invites Filter')
        .setDescription(`Discord invite link filter has been ${enable ? 'enabled' : 'disabled'}.`)
        .setColor(enable ? '#00ff00' : '#ff0000')
        .setFooter({ 
          text: `Requested by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error in anti-invites command: ${error}`);
      await interaction.reply({ 
        content: 'There was an error processing your command!', 
        ephemeral: true 
      });
    }
  },
  
  // Legacy command execution
  async run(client, message, args) {
    try {
      // Check for required permissions
      if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return message.reply('You need the **Manage Server** permission to use this command!');
      }
      
      // Check for missing arguments
      if (!args[0]) {
        return message.reply('Please specify whether to `enable` or `disable` the invite filter!');
      }
      
      // Determine action
      const action = args[0].toLowerCase();
      let enable = false;
      
      if (action === 'enable' || action === 'on' || action === 'true') {
        enable = true;
      } else if (action === 'disable' || action === 'off' || action === 'false') {
        enable = false;
      } else {
        return message.reply('Invalid option! Please use `enable` or `disable`.');
      }
      
      // Find the guild settings
      let guildSettings = await Guild.findOne({ guildID: message.guild.id });
      
      // Create settings if they don't exist
      if (!guildSettings) {
        guildSettings = new Guild({
          guildID: message.guild.id,
          antiInvites: enable
        });
        
        await guildSettings.save();
      } else {
        // Update the settings
        await Guild.updateOne(
          { guildID: message.guild.id },
          { antiInvites: enable }
        );
      }
      
      // Create response embed
      const embed = new EmbedBuilder()
        .setTitle('Anti-Invites Filter')
        .setDescription(`Discord invite link filter has been ${enable ? 'enabled' : 'disabled'}.`)
        .setColor(enable ? '#00ff00' : '#ff0000')
        .setFooter({ 
          text: `Requested by ${message.author.tag}`,
          iconURL: message.author.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp();
      
      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error in legacy anti-invites command: ${error}`);
      message.reply('There was an error processing your command!');
    }
  }
};