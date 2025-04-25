const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Guild = require('../../models/Guild');
const logger = require('../../utils/logger');

module.exports = {
  name: 'prefix',
  description: 'Set or view the command prefix for this server',
  category: 'config',
  aliases: ['setprefix'],
  usage: '[new prefix]',
  examples: ['prefix', 'prefix !', 'prefix ?'],
  userPermissions: [PermissionFlagsBits.ManageGuild],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('prefix')
    .setDescription('Set or view the command prefix for this server')
    .addStringOption(option =>
      option.setName('new_prefix')
        .setDescription('The new prefix to set (leave empty to view current prefix)')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  
  // Slash command execution
  async execute(interaction) {
    try {
      // Get the new prefix if provided
      const newPrefix = interaction.options.getString('new_prefix');
      
      // Find the guild settings
      let guildSettings = await Guild.findOne({ guildID: interaction.guild.id });
      
      // Create settings if they don't exist
      if (!guildSettings) {
        guildSettings = new Guild({
          guildID: interaction.guild.id,
          prefix: '!', // Default prefix
        });
        
        await guildSettings.save();
      }
      
      // If no new prefix was provided, show the current prefix
      if (!newPrefix) {
        const embed = new EmbedBuilder()
          .setTitle('Server Prefix')
          .setDescription(`The current command prefix is: \`${guildSettings.prefix}\``)
          .setColor('#0099ff')
          .setFooter({ 
            text: 'Use /prefix <new_prefix> to change it' 
          });
        
        return interaction.reply({ embeds: [embed] });
      }
      
      // Validate the new prefix
      if (newPrefix.length > 5) {
        return interaction.reply({
          content: 'The prefix cannot be longer than 5 characters!',
          ephemeral: true
        });
      }
      
      // Update the prefix
      await Guild.updateOne(
        { guildID: interaction.guild.id },
        { prefix: newPrefix }
      );
      
      // Confirm the change
      const embed = new EmbedBuilder()
        .setTitle('Prefix Updated')
        .setDescription(`Server prefix has been changed to: \`${newPrefix}\``)
        .setColor('#00ff00')
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error in prefix command: ${error}`);
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
      
      // Find the guild settings
      let guildSettings = await Guild.findOne({ guildID: message.guild.id });
      
      // Create settings if they don't exist
      if (!guildSettings) {
        guildSettings = new Guild({
          guildID: message.guild.id,
          prefix: '!', // Default prefix
        });
        
        await guildSettings.save();
      }
      
      // If no new prefix was provided, show the current prefix
      if (!args[0]) {
        const embed = new EmbedBuilder()
          .setTitle('Server Prefix')
          .setDescription(`The current command prefix is: \`${guildSettings.prefix}\``)
          .setColor('#0099ff')
          .setFooter({ 
            text: `Use ${guildSettings.prefix}prefix <new_prefix> to change it` 
          });
        
        return message.reply({ embeds: [embed] });
      }
      
      const newPrefix = args[0];
      
      // Validate the new prefix
      if (newPrefix.length > 5) {
        return message.reply('The prefix cannot be longer than 5 characters!');
      }
      
      // Update the prefix
      await Guild.updateOne(
        { guildID: message.guild.id },
        { prefix: newPrefix }
      );
      
      // Confirm the change
      const embed = new EmbedBuilder()
        .setTitle('Prefix Updated')
        .setDescription(`Server prefix has been changed to: \`${newPrefix}\``)
        .setColor('#00ff00')
        .setTimestamp();
      
      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error in legacy prefix command: ${error}`);
      message.reply('There was an error processing your command!');
    }
  }
};