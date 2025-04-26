const { SlashCommandBuilder, ChannelType, PermissionFlagsBits, MessageFlags } = require('discord.js');
const logger = require('../../utils/logger');

module.exports = {
  name: 'say',
  description: 'Make the bot send a message!',
  category: 'fun',
  cooldown: 3,

  // Slash command data
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
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildText)),

  async execute(client, interaction) {
    try {
      const channel = interaction.options.getChannel('channel') || interaction.channel;
      const message = interaction.options.getString('message');

      // Check channel permissions
      if (!channel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.SendMessages)) {
        return await interaction.reply({ 
          content: 'I don\'t have permission to send messages in that channel!',
          flags: MessageFlags.Ephemeral 
        });
      }

      if (!channel.permissionsFor(interaction.member).has(PermissionFlagsBits.SendMessages)) {
        return await interaction.reply({ 
          content: 'You don\'t have permission to send messages in that channel!',
          flags: MessageFlags.Ephemeral 
        });
      }

      // Send the message
      await channel.send(message);

      // Send confirmation
      if (channel.id !== interaction.channel.id) {
        await interaction.reply({ 
          content: `Message sent to ${channel}!`,
          flags: MessageFlags.Ephemeral 
        });
      } else {
        await interaction.reply({ 
          content: 'Message sent!',
          flags: MessageFlags.Ephemeral 
        });
      }

    } catch (error) {
      logger.error(`Error in say command: ${error}`);
      await interaction.reply({ 
        content: 'There was an error executing that command!',
        flags: MessageFlags.Ephemeral 
      });
    }
  },

  // Execute legacy command
  async run(message, args, client) {
    try {
      // Get channel
      let channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]);
      if (channel) {
        args.shift();
      } else {
        channel = message.channel;
      }

      // Check if channel is text channel
      if (channel.type !== ChannelType.GuildText) {
        return message.reply('I can only send messages to text channels!');
      }

      // Check if there's a message to say
      if (!args[0]) {
        return message.reply('What do you want me to say?');
      }

      // Check channel permissions
      if (!channel.permissionsFor(message.guild.members.me).has(PermissionFlagsBits.SendMessages)) {
        return message.reply('I don\'t have permission to send messages in that channel!');
      }

      if (!channel.permissionsFor(message.member).has(PermissionFlagsBits.SendMessages)) {
        return message.reply('You don\'t have permission to send messages in that channel!');
      }

      // Get message content
      const msg = message.content.slice(message.content.indexOf(args[0]), message.content.length);

      // Send message and delete original command
      await channel.send(msg);
      if (message.deletable) await message.delete().catch(() => {});

    } catch (error) {
      logger.error(`Error in say command: ${error}`);
      await message.channel.send('There was an error executing that command!');
    }
  }
};