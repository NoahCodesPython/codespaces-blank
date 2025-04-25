const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Guild = require('../../models/Guild');
const logger = require('../../utils/logger');

module.exports = {
  name: 'prefix',
  description: 'View or change the bot prefix for this server',
  category: 'config',
  aliases: ['setprefix', 'changeprefix'],
  usage: '[new prefix]',
  examples: ['prefix', 'prefix !', 'prefix >'],
  userPermissions: [PermissionFlagsBits.ManageGuild],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('prefix')
    .setDescription('View or change the bot prefix for this server')
    .addStringOption(option => 
      option.setName('new_prefix')
        .setDescription('The new prefix to set')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  
  // Slash command execution
  async execute(interaction) {
    try {
      const newPrefix = interaction.options.getString('new_prefix');
      
      // If no prefix provided, just show the current prefix
      if (!newPrefix) {
        return await showCurrentPrefix(interaction);
      }
      
      // Validate prefix length
      if (newPrefix.length > 5) {
        return interaction.reply({
          content: 'The prefix cannot be longer than 5 characters.',
          ephemeral: true
        });
      }
      
      // Update prefix in database
      let guildSettings = await Guild.findOne({ guildID: interaction.guild.id });
      
      if (!guildSettings) {
        // Create new guild settings
        guildSettings = new Guild({
          guildID: interaction.guild.id,
          prefix: newPrefix
        });
      } else {
        // Update existing settings
        guildSettings.prefix = newPrefix;
      }
      
      await guildSettings.save();
      
      // Create success embed
      const embed = new EmbedBuilder()
        .setTitle('Prefix Updated')
        .setDescription(`✅ The prefix has been updated to \`${newPrefix}\``)
        .setColor('#00FF00')
        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing prefix command: ${error}`);
      await interaction.reply({ 
        content: 'There was an error executing this command!', 
        ephemeral: true 
      });
    }
  },
  
  // Legacy command execution
  async run(client, message, args) {
    try {
      // If no new prefix provided, just show the current prefix
      if (!args.length) {
        return await showCurrentPrefixLegacy(message);
      }
      
      const newPrefix = args[0];
      
      // Validate prefix length
      if (newPrefix.length > 5) {
        return message.reply('The prefix cannot be longer than 5 characters.');
      }
      
      // Update prefix in database
      let guildSettings = await Guild.findOne({ guildID: message.guild.id });
      
      if (!guildSettings) {
        // Create new guild settings
        guildSettings = new Guild({
          guildID: message.guild.id,
          prefix: newPrefix
        });
      } else {
        // Update existing settings
        guildSettings.prefix = newPrefix;
      }
      
      await guildSettings.save();
      
      // Create success embed
      const embed = new EmbedBuilder()
        .setTitle('Prefix Updated')
        .setDescription(`✅ The prefix has been updated to \`${newPrefix}\``)
        .setColor('#00FF00')
        .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTimestamp();
      
      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing prefix command: ${error}`);
      message.reply('There was an error executing this command!');
    }
  }
};

// Helper function to show current prefix (slash command)
async function showCurrentPrefix(interaction) {
  try {
    // Get guild settings
    const guildSettings = await Guild.findOne({ guildID: interaction.guild.id });
    
    // Get the current prefix
    const currentPrefix = guildSettings?.prefix || process.env.PREFIX || '!';
    
    // Create embed
    const embed = new EmbedBuilder()
      .setTitle('Current Prefix')
      .setDescription(`The current prefix for this server is \`${currentPrefix}\``)
      .addFields({ 
        name: 'Usage', 
        value: `To change the prefix, use \`/prefix [new prefix]\`` 
      })
      .setColor('#3498db')
      .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
    
  } catch (error) {
    logger.error(`Error showing current prefix: ${error}`);
    await interaction.reply({ 
      content: 'There was an error fetching the current prefix!', 
      ephemeral: true 
    });
  }
}

// Helper function to show current prefix (legacy command)
async function showCurrentPrefixLegacy(message) {
  try {
    // Get guild settings
    const guildSettings = await Guild.findOne({ guildID: message.guild.id });
    
    // Get the current prefix
    const currentPrefix = guildSettings?.prefix || process.env.PREFIX || '!';
    
    // Create embed
    const embed = new EmbedBuilder()
      .setTitle('Current Prefix')
      .setDescription(`The current prefix for this server is \`${currentPrefix}\``)
      .addFields({ 
        name: 'Usage', 
        value: `To change the prefix, use \`${currentPrefix}prefix [new prefix]\`` 
      })
      .setColor('#3498db')
      .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) })
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
    
  } catch (error) {
    logger.error(`Error showing current prefix: ${error}`);
    message.reply('There was an error fetching the current prefix!');
  }
}