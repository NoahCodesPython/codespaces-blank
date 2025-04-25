const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const CustomCommand = require('../../models/CustomCommand');
const logger = require('../../utils/logger');

module.exports = {
  name: 'deletecommand',
  description: 'Delete a custom command from the server',
  category: 'config',
  aliases: ['delcmd', 'removecommand', 'deletecmd'],
  usage: '<command name>',
  examples: ['deletecommand hello', 'deletecommand serverinfo'],
  userPermissions: [PermissionFlagsBits.ManageGuild],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('deletecommand')
    .setDescription('Delete a custom command from the server')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('The name of the custom command to delete')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  
  // Slash command execution
  async execute(interaction) {
    try {
      // Get command name
      const name = interaction.options.getString('name').toLowerCase();
      
      // Find the command
      const command = await CustomCommand.findOne({ 
        guildID: interaction.guild.id,
        name: name
      });
      
      // Check if command exists
      if (!command) {
        return interaction.reply({ 
          content: `Custom command \`${name}\` does not exist!`, 
          ephemeral: true 
        });
      }
      
      // Delete the command
      await CustomCommand.deleteOne({ 
        guildID: interaction.guild.id,
        name: name
      });
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle('Custom Command Deleted')
        .setDescription(`Command \`${name}\` has been deleted.`)
        .setColor('#ff0000')
        .setFooter({ 
          text: `Deleted by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error in deletecommand command: ${error}`);
      await interaction.reply({ 
        content: 'There was an error deleting the custom command!', 
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
        return message.reply('Please provide the name of the custom command to delete!');
      }
      
      const name = args[0].toLowerCase();
      
      // Find the command
      const command = await CustomCommand.findOne({ 
        guildID: message.guild.id,
        name: name
      });
      
      // Check if command exists
      if (!command) {
        return message.reply(`Custom command \`${name}\` does not exist!`);
      }
      
      // Delete the command
      await CustomCommand.deleteOne({ 
        guildID: message.guild.id,
        name: name
      });
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle('Custom Command Deleted')
        .setDescription(`Command \`${name}\` has been deleted.`)
        .setColor('#ff0000')
        .setFooter({ 
          text: `Deleted by ${message.author.tag}`,
          iconURL: message.author.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp();
      
      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error in legacy deletecommand command: ${error}`);
      message.reply('There was an error deleting the custom command!');
    }
  }
};