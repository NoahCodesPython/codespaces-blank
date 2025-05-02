const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isOwner, removeOwner } = require('../../utils/ownerCheck');
const logger = require('../../utils/logger');

module.exports = {
  name: 'removeowner',
  description: 'Removes a user from bot owners',
  category: 'owner',
  aliases: ['delowner', 'deleteowner'],
  usage: '<user>',
  examples: ['removeowner @User', 'removeowner 123456789012345678'],
  userPermissions: [],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('removeowner')
    .setDescription('Removes a user from bot owners')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to remove from bot owners')
        .setRequired(true)),
  
  // Slash command execution
  async execute(interaction) {
    try {
      // Check if executor is a bot owner
      const isExecutorOwner = await isOwner(interaction.user.id);
      
      if (!isExecutorOwner) {
        return interaction.reply({
          content: 'You do not have permission to use this command.',
          ephemeral: true
        });
      }
      
      // Defer reply as this might take a moment
      await interaction.deferReply();
      
      // Get the user to remove
      const user = interaction.options.getUser('user');
      
      // Remove the user as an owner
      const result = await removeOwner(user.id);
      
      if (!result.success) {
        return interaction.editReply(`Failed to remove user as bot owner: ${result.message}`);
      }
      
      // Create success embed
      const embed = new EmbedBuilder()
        .setTitle('Bot Owner Removed')
        .setDescription(`${user.tag} has been removed as a bot owner.`)
        .setColor('#FF9900')
        .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      
      // Log the action
      logger.info(`${interaction.user.tag} (${interaction.user.id}) removed ${user.tag} (${user.id}) from bot owners.`);
      
    } catch (error) {
      logger.error(`Error in removeowner command: ${error}`);
      
      if (interaction.deferred) {
        await interaction.editReply({ 
          content: 'There was an error removing the bot owner.'
        });
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
      // Check if executor is a bot owner
      const isExecutorOwner = await isOwner(message.author.id);
      
      if (!isExecutorOwner) {
        return message.reply('You do not have permission to use this command.');
      }
      
      // Get the user to remove
      const user = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null);
      
      if (!user) {
        return message.reply('Please mention a user or provide a valid user ID.');
      }
      
      // Remove the user as an owner
      const result = await removeOwner(user.id);
      
      if (!result.success) {
        return message.reply(`Failed to remove user as bot owner: ${result.message}`);
      }
      
      // Create success embed
      const embed = new EmbedBuilder()
        .setTitle('Bot Owner Removed')
        .setDescription(`${user.tag} has been removed as a bot owner.`)
        .setColor('#FF9900')
        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      
      await message.reply({ embeds: [embed] });
      
      // Log the action
      logger.info(`${message.author.tag} (${message.author.id}) removed ${user.tag} (${user.id}) from bot owners.`);
      
    } catch (error) {
      logger.error(`Error in legacy removeowner command: ${error}`);
      message.reply('There was an error removing the bot owner.');
    }
  }
};