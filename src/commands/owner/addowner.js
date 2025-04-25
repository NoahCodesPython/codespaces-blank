const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isOwner, addOwner } = require('../../utils/ownerCheck');
const logger = require('../../utils/logger');

module.exports = {
  name: 'addowner',
  description: 'Adds a user as a bot owner',
  category: 'owner',
  aliases: ['setowner'],
  usage: '<user>',
  examples: ['addowner @User', 'addowner 123456789012345678'],
  userPermissions: [],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('addowner')
    .setDescription('Adds a user as a bot owner')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to add as bot owner')
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
      
      // Get the user to add
      const user = interaction.options.getUser('user');
      
      // Add the user as an owner
      const result = await addOwner(user.id, interaction.user.id);
      
      if (!result.success) {
        return interaction.editReply(`Failed to add user as bot owner: ${result.message}`);
      }
      
      // Create success embed
      const embed = new EmbedBuilder()
        .setTitle('Bot Owner Added')
        .setDescription(`${user.tag} has been added as a bot owner.`)
        .setColor('#00FF00')
        .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      
      // Log the action
      logger.info(`${interaction.user.tag} (${interaction.user.id}) added ${user.tag} (${user.id}) as a bot owner.`);
      
    } catch (error) {
      logger.error(`Error in addowner command: ${error}`);
      
      if (interaction.deferred) {
        await interaction.editReply({ 
          content: 'There was an error adding the bot owner.'
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
      
      // Get the user to add
      const user = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null);
      
      if (!user) {
        return message.reply('Please mention a user or provide a valid user ID.');
      }
      
      // Add the user as an owner
      const result = await addOwner(user.id, message.author.id);
      
      if (!result.success) {
        return message.reply(`Failed to add user as bot owner: ${result.message}`);
      }
      
      // Create success embed
      const embed = new EmbedBuilder()
        .setTitle('Bot Owner Added')
        .setDescription(`${user.tag} has been added as a bot owner.`)
        .setColor('#00FF00')
        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      
      await message.reply({ embeds: [embed] });
      
      // Log the action
      logger.info(`${message.author.tag} (${message.author.id}) added ${user.tag} (${user.id}) as a bot owner.`);
      
    } catch (error) {
      logger.error(`Error in legacy addowner command: ${error}`);
      message.reply('There was an error adding the bot owner.');
    }
  }
};