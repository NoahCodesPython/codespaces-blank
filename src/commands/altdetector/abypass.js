const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { AltDetector } = require('../../models/AltDetector');
const Guild = require('../../models/Guild');
const logger = require('../../utils/logger');

module.exports = {
  name: 'abypass',
  description: 'Add a user to the alt detection whitelist',
  category: 'altdetector',
  aliases: ['altbypass', 'awhitelist'],
  usage: '<add | remove> <user>',
  examples: ['abypass add @User', 'abypass remove @User'],
  userPermissions: [PermissionFlagsBits.ManageGuild],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('abypass')
    .setDescription('Manage alt detection whitelist')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a user to the alt detection whitelist')
        .addUserOption(option => 
          option.setName('user')
            .setDescription('The user to whitelist')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('removefromwhitelist')
        .setDescription('Remove a user from the alt detection whitelist')
        .addUserOption(option => 
          option.setName('user')
            .setDescription('The user to remove from whitelist')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all whitelisted users'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  
  // Slash command execution
  async execute(interaction) {
    try {
      const subcommand = interaction.options.getSubcommand();
      
      // Get alt detector settings
      let altSettings = await AltDetector.findOne({ guildID: interaction.guild.id });
      
      // Create settings if they don't exist
      if (!altSettings) {
        altSettings = new AltDetector({
          guildID: interaction.guild.id,
          allowedAlts: []
        });
        await altSettings.save();
      }
      
      if (subcommand === 'add') {
        const user = interaction.options.getUser('user');
        
        // Check if user is already whitelisted
        if (altSettings.allowedAlts.includes(user.id)) {
          return interaction.reply({
            content: `${user.tag} is already whitelisted.`,
            ephemeral: true
          });
        }
        
        // Add user to whitelist
        altSettings.allowedAlts.push(user.id);
        await altSettings.save();
        
        const embed = new EmbedBuilder()
          .setTitle('Alt Detector Whitelist Updated')
          .setDescription(`✅ **${user.tag}** has been added to the alt detection whitelist.`)
          .setColor('#00FF00')
          .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
          .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
        
      } else if (subcommand === 'removefromwhitelist') {
        const user = interaction.options.getUser('user');
        
        // Check if user is whitelisted
        if (!altSettings.allowedAlts.includes(user.id)) {
          return interaction.reply({
            content: `${user.tag} is not on the whitelist.`,
            ephemeral: true
          });
        }
        
        // Remove user from whitelist
        altSettings.allowedAlts = altSettings.allowedAlts.filter(id => id !== user.id);
        await altSettings.save();
        
        const embed = new EmbedBuilder()
          .setTitle('Alt Detector Whitelist Updated')
          .setDescription(`✅ **${user.tag}** has been removed from the alt detection whitelist.`)
          .setColor('#FF0000')
          .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
          .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
        
      } else if (subcommand === 'list') {
        if (altSettings.allowedAlts.length === 0) {
          return interaction.reply({
            content: 'There are no users on the alt detection whitelist.',
            ephemeral: true
          });
        }
        
        // Fetch user details for all whitelisted users
        let whitelist = '';
        
        for (const userId of altSettings.allowedAlts) {
          try {
            const user = await interaction.client.users.fetch(userId);
            whitelist += `• ${user.tag} (${userId})\n`;
          } catch (error) {
            whitelist += `• Unknown User (${userId})\n`;
          }
        }
        
        const embed = new EmbedBuilder()
          .setTitle('Alt Detector Whitelist')
          .setDescription(whitelist)
          .setColor('#3498db')
          .setFooter({ text: `Total: ${altSettings.allowedAlts.length} users`, iconURL: interaction.guild.iconURL({ dynamic: true }) })
          .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
      }
      
    } catch (error) {
      logger.error(`Error executing abypass command: ${error}`);
      await interaction.reply({ 
        content: 'There was an error executing this command!', 
        ephemeral: true 
      });
    }
  },
  
  // Legacy command execution
  async run(client, message, args) {
    try {
      if (!args[0]) {
        return message.reply('Please specify an action: `add`, `remove`, or `list`.');
      }
      
      const action = args[0].toLowerCase();
      
      if (!['add', 'remove', 'list'].includes(action)) {
        return message.reply('Invalid action. Please use `add`, `remove`, or `list`.');
      }
      
      // Get alt detector settings
      let altSettings = await AltDetector.findOne({ guildID: message.guild.id });
      
      // Create settings if they don't exist
      if (!altSettings) {
        altSettings = new AltDetector({
          guildID: message.guild.id,
          allowedAlts: []
        });
        await altSettings.save();
      }
      
      if (action === 'add') {
        if (!args[1]) {
          return message.reply('Please specify a user to add to the whitelist.');
        }
        
        // Get the user from mention or ID
        const user = message.mentions.users.first() || await client.users.fetch(args[1]).catch(() => null);
        
        if (!user) {
          return message.reply('Please specify a valid user.');
        }
        
        // Check if user is already whitelisted
        if (altSettings.allowedAlts.includes(user.id)) {
          return message.reply(`${user.tag} is already whitelisted.`);
        }
        
        // Add user to whitelist
        altSettings.allowedAlts.push(user.id);
        await altSettings.save();
        
        const embed = new EmbedBuilder()
          .setTitle('Alt Detector Whitelist Updated')
          .setDescription(`✅ **${user.tag}** has been added to the alt detection whitelist.`)
          .setColor('#00FF00')
          .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) })
          .setTimestamp();
        
        await message.reply({ embeds: [embed] });
        
      } else if (action === 'remove') {
        if (!args[1]) {
          return message.reply('Please specify a user to remove from the whitelist.');
        }
        
        // Get the user from mention or ID
        const user = message.mentions.users.first() || await client.users.fetch(args[1]).catch(() => null);
        
        if (!user) {
          return message.reply('Please specify a valid user.');
        }
        
        // Check if user is whitelisted
        if (!altSettings.allowedAlts.includes(user.id)) {
          return message.reply(`${user.tag} is not on the whitelist.`);
        }
        
        // Remove user from whitelist
        altSettings.allowedAlts = altSettings.allowedAlts.filter(id => id !== user.id);
        await altSettings.save();
        
        const embed = new EmbedBuilder()
          .setTitle('Alt Detector Whitelist Updated')
          .setDescription(`✅ **${user.tag}** has been removed from the alt detection whitelist.`)
          .setColor('#FF0000')
          .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) })
          .setTimestamp();
        
        await message.reply({ embeds: [embed] });
        
      } else if (action === 'list') {
        if (altSettings.allowedAlts.length === 0) {
          return message.reply('There are no users on the alt detection whitelist.');
        }
        
        // Fetch user details for all whitelisted users
        let whitelist = '';
        
        for (const userId of altSettings.allowedAlts) {
          try {
            const user = await client.users.fetch(userId);
            whitelist += `• ${user.tag} (${userId})\n`;
          } catch (error) {
            whitelist += `• Unknown User (${userId})\n`;
          }
        }
        
        const embed = new EmbedBuilder()
          .setTitle('Alt Detector Whitelist')
          .setDescription(whitelist)
          .setColor('#3498db')
          .setFooter({ text: `Total: ${altSettings.allowedAlts.length} users`, iconURL: message.guild.iconURL({ dynamic: true }) })
          .setTimestamp();
        
        await message.reply({ embeds: [embed] });
      }
      
    } catch (error) {
      logger.error(`Error executing abypass command: ${error}`);
      message.reply('There was an error executing this command!');
    }
  }
};