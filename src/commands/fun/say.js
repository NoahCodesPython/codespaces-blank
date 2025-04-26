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
      const channel = interaction.options.getChannel('channel') || interaction.channel;
      const message = interaction.options.getString('message');

      // Check channel permissions
      if (!channel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.SendMessages)) {
        return await interaction.reply({
          content: 'I don\'t have permission to send messages in that channel!',
          ephemeral: true
        });
      }

      if (!channel.permissionsFor(interaction.member).has(PermissionFlagsBits.SendMessages)) {
        return await interaction.reply({
          content: 'You don\'t have permission to send messages in that channel!',
          ephemeral: true
        });
      }

      // Send the message
      await channel.send(message);

      // Send confirmation
      if (channel.id !== interaction.channel.id) {
        await interaction.reply({
          content: `Message sent to ${channel}!`,
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content: 'Message sent!',
          ephemeral: true
        });
      }

    } catch (error) {
      logger.error(`Error in say command: ${error}`);
      await interaction.reply({
        content: 'There was an error executing that command!',
        ephemeral: true
      });
    }
  }
};