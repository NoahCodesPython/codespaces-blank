const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const ReactionRole = require('../../models/reactionrole/ReactionRole');
const logger = require('../../utils/logger');

module.exports = {
  name: 'reactionroledelete',
  description: 'Delete a reaction role message',
  category: 'reactionrole',
  aliases: ['rrdelete', 'deleterr', 'removereactionrole'],
  usage: '<message_id>',
  examples: ['reactionroledelete 123456789012345678'],
  userPermissions: [PermissionFlagsBits.ManageRoles],
  botPermissions: [PermissionFlagsBits.ManageRoles],
  
  data: new SlashCommandBuilder()
    .setName('reactionroledelete')
    .setDescription('Delete a reaction role message')
    .addStringOption(option => 
      option.setName('message_id')
        .setDescription('The ID of the reaction role message to delete')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  
  // Slash command execution
  async execute(interaction) {
    try {
      // Check permissions
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
        return interaction.reply({
          content: 'You need the **Manage Roles** permission to use this command!',
          ephemeral: true
        });
      }
      
      // Get the message ID
      const messageId = interaction.options.getString('message_id');
      
      // Find the reaction role in the database
      const reactionRole = await ReactionRole.findOne({
        messageID: messageId,
        guildID: interaction.guildId
      });
      
      if (!reactionRole) {
        return interaction.reply({
          content: 'No reaction role found with that message ID in this server.',
          ephemeral: true
        });
      }
      
      // Try to find the message
      const channel = await interaction.guild.channels.fetch(reactionRole.channelID).catch(() => null);
      let messageDeleted = false;
      
      if (channel) {
        try {
          const message = await channel.messages.fetch(messageId);
          await message.delete();
          messageDeleted = true;
        } catch (err) {
          logger.warn(`Could not delete reaction role message: ${err}`);
        }
      }
      
      // Delete from database
      await ReactionRole.deleteOne({
        messageID: messageId,
        guildID: interaction.guildId
      });
      
      // Send success message
      const embed = new EmbedBuilder()
        .setTitle('Reaction Role Deleted')
        .setDescription(`Reaction role with message ID ${messageId} has been deleted from the database.${messageDeleted ? ' The message has also been deleted.' : ' The message could not be deleted (it may already be gone).'}`)
        .setColor('#00FF00')
        .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing reactionroledelete command: ${error}`);
      await interaction.reply({ 
        content: 'There was an error executing this command!', 
        ephemeral: true 
      });
    }
  },
  
  // Legacy command execution
  async run(client, message, args) {
    try {
      // Check permissions
      if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
        return message.reply('You need the **Manage Roles** permission to use this command!');
      }
      
      // Check if message ID was provided
      if (!args.length) {
        return message.reply('Please provide the message ID of the reaction role to delete!\nUsage: `reactionroledelete <message_id>`');
      }
      
      const messageId = args[0];
      
      // Find the reaction role in the database
      const reactionRole = await ReactionRole.findOne({
        messageID: messageId,
        guildID: message.guildId
      });
      
      if (!reactionRole) {
        return message.reply('No reaction role found with that message ID in this server.');
      }
      
      // Try to find the message
      const channel = await message.guild.channels.fetch(reactionRole.channelID).catch(() => null);
      let messageDeleted = false;
      
      if (channel) {
        try {
          const msg = await channel.messages.fetch(messageId);
          await msg.delete();
          messageDeleted = true;
        } catch (err) {
          logger.warn(`Could not delete reaction role message: ${err}`);
        }
      }
      
      // Delete from database
      await ReactionRole.deleteOne({
        messageID: messageId,
        guildID: message.guildId
      });
      
      // Send success message
      const embed = new EmbedBuilder()
        .setTitle('Reaction Role Deleted')
        .setDescription(`Reaction role with message ID ${messageId} has been deleted from the database.${messageDeleted ? ' The message has also been deleted.' : ' The message could not be deleted (it may already be gone).'}`)
        .setColor('#00FF00')
        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      
      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing reactionroledelete command: ${error}`);
      message.reply('There was an error executing this command!');
    }
  }
};