const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const AutoResponse = require('../../models/AutoResponse');
const logger = require('../../utils/logger');

module.exports = {
  name: 'deleteresponse',
  description: 'Delete an auto-response from the server',
  category: 'config',
  aliases: ['delar', 'removeresponse', 'deletear'],
  usage: '<trigger>',
  examples: ['deleteresponse hello', 'deleteresponse "how are you"'],
  userPermissions: [PermissionFlagsBits.ManageGuild],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('deleteresponse')
    .setDescription('Delete an auto-response from the server')
    .addStringOption(option =>
      option.setName('trigger')
        .setDescription('The trigger text of the auto-response to delete')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  
  // Slash command execution
  async execute(interaction) {
    try {
      // Get trigger from options
      const trigger = interaction.options.getString('trigger');
      
      // Find the auto-response (try both case variants)
      let autoResponse = await AutoResponse.findOne({ 
        guildID: interaction.guild.id,
        trigger: trigger
      });
      
      // If not found, try lowercase version
      if (!autoResponse) {
        autoResponse = await AutoResponse.findOne({ 
          guildID: interaction.guild.id,
          trigger: trigger.toLowerCase()
        });
      }
      
      // Check if auto-response exists
      if (!autoResponse) {
        return interaction.reply({ 
          content: `Auto-response with trigger "${trigger}" does not exist!`, 
          ephemeral: true 
        });
      }
      
      // Delete the auto-response
      await AutoResponse.deleteOne({ _id: autoResponse._id });
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle('Auto-Response Deleted')
        .setDescription(`Auto-response with trigger "${autoResponse.trigger}" has been deleted.`)
        .setColor('#ff0000')
        .setFooter({ 
          text: `Deleted by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error in deleteresponse command: ${error}`);
      await interaction.reply({ 
        content: 'There was an error deleting the auto-response!', 
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
        return message.reply('Please provide the trigger of the auto-response to delete!');
      }
      
      // Handle quoted strings
      let trigger;
      if (args[0].startsWith('"')) {
        // Find the closing quote
        const fullText = args.join(' ');
        const closingQuoteIndex = fullText.indexOf('"', 1);
        
        if (closingQuoteIndex > 0) {
          trigger = fullText.substring(1, closingQuoteIndex);
        } else {
          trigger = args[0].substring(1); // Just remove first quote if no closing quote
        }
      } else {
        trigger = args[0];
      }
      
      // Find the auto-response (try both case variants)
      let autoResponse = await AutoResponse.findOne({ 
        guildID: message.guild.id,
        trigger: trigger
      });
      
      // If not found, try lowercase version
      if (!autoResponse) {
        autoResponse = await AutoResponse.findOne({ 
          guildID: message.guild.id,
          trigger: trigger.toLowerCase()
        });
      }
      
      // Check if auto-response exists
      if (!autoResponse) {
        return message.reply(`Auto-response with trigger "${trigger}" does not exist!`);
      }
      
      // Delete the auto-response
      await AutoResponse.deleteOne({ _id: autoResponse._id });
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle('Auto-Response Deleted')
        .setDescription(`Auto-response with trigger "${autoResponse.trigger}" has been deleted.`)
        .setColor('#ff0000')
        .setFooter({ 
          text: `Deleted by ${message.author.tag}`,
          iconURL: message.author.displayAvatarURL({ dynamic: true })
        })
        .setTimestamp();
      
      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error in legacy deleteresponse command: ${error}`);
      message.reply('There was an error deleting the auto-response!');
    }
  }
};