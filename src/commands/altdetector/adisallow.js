const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { AltDetector } = require('../../models/AltDetector');
const Guild = require('../../models/Guild');
const logger = require('../../utils/logger');

// Helper function to remove a value from an array
function removeFromArray(arr, value) {
  return arr.filter(item => item !== value);
}

module.exports = {
  name: 'adisallow',
  description: 'Remove a user from the alt detection whitelist',
  category: 'altdetector',
  aliases: ['altdisallow', 'aremove'],
  usage: '<user>',
  examples: ['adisallow @User', 'adisallow 123456789012345678'],
  userPermissions: [PermissionFlagsBits.ManageGuild],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('adisallow')
    .setDescription('Remove a user from the alt detection whitelist')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to remove from whitelist')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  
  // Slash command execution
  async execute(interaction) {
    try {
      const user = interaction.options.getUser('user');
      
      // Get alt detector settings
      let altSettings = await AltDetector.findOne({ guildID: interaction.guild.id });
      
      // Check if settings exist and user is whitelisted
      if (!altSettings || !altSettings.allowedAlts.includes(user.id)) {
        return interaction.reply({
          content: `${user.tag} is not on the alt detection whitelist.`,
          ephemeral: true
        });
      }
      
      // Remove user from whitelist
      altSettings.allowedAlts = removeFromArray(altSettings.allowedAlts, user.id);
      await altSettings.save();
      
      const embed = new EmbedBuilder()
        .setTitle('Alt Detector Whitelist Updated')
        .setDescription(`✅ **${user.tag}** has been removed from the alt detection whitelist.`)
        .setColor('#FF0000')
        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing adisallow command: ${error}`);
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
        return message.reply('Please specify a user to remove from the whitelist.');
      }
      
      // Get the user from mention or ID
      const user = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null);
      
      if (!user) {
        return message.reply('Please specify a valid user.');
      }
      
      // Get alt detector settings
      let altSettings = await AltDetector.findOne({ guildID: message.guild.id });
      
      // Check if settings exist and user is whitelisted
      if (!altSettings || !altSettings.allowedAlts.includes(user.id)) {
        return message.reply(`${user.tag} is not on the alt detection whitelist.`);
      }
      
      // Remove user from whitelist
      altSettings.allowedAlts = removeFromArray(altSettings.allowedAlts, user.id);
      await altSettings.save();
      
      const embed = new EmbedBuilder()
        .setTitle('Alt Detector Whitelist Updated')
        .setDescription(`✅ **${user.tag}** has been removed from the alt detection whitelist.`)
        .setColor('#FF0000')
        .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) })
        .setTimestamp();
      
      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing adisallow command: ${error}`);
      message.reply('There was an error executing this command!');
    }
  }
};