const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const logger = require('../../utils/logger');

module.exports = {
  name: 'say',
  description: 'Make the bot send a message',
  category: 'fun',
  cooldown: 3,

  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Make the bot send a message')
    .addStringOption(option => 
      option.setName('message')
        .setDescription('The message to send')
        .setRequired(true))
    .addChannelOption(option => 
      option.setName('channel')
        .setDescription('The channel to send the message to')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true }); // Acknowledge the interaction immediately

      const channel = interaction.options.getChannel('channel') || interaction.channel;
      const message = interaction.options.getString('message');

      // Check channel permissions
      if (!channel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.SendMessages)) {
        return await interaction.editReply('I don\'t have permission to send messages in that channel!');
      }

      if (!channel.permissionsFor(interaction.member).has(PermissionFlagsBits.SendMessages)) {
        return await interaction.editReply('You don\'t have permission to send messages in that channel!');
      }

      // Send the message
      await channel.send(message);

      // Send confirmation
      if (channel.id !== interaction.channel.id) {
        await interaction.editReply(`Message sent to ${channel}!`);
      } else {
        await interaction.editReply('Message sent!');
      }

    } catch (error) {
      logger.error(`Error in say command: ${error}`);
      await interaction.editReply('There was an error executing that command!');
    }
  }
};