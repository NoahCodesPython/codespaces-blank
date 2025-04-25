const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const logger = require('../../utils/logger');

// URL regex for validation
const urlRegex = /^(?:(?:https?|ftp):\/\/)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/\S*)?$/;

// Track users who have embed creation in progress
const embedStarted = new Set();

module.exports = {
  name: 'embed',
  description: 'Create a custom embed',
  category: 'utility',
  aliases: ['embedify', 'embedbuilder'],
  cooldown: 5,
  userPermissions: [PermissionFlagsBits.ManageMessages],
  
  // Slash command data
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Create a custom embed')
    .addChannelOption(option => 
      option.setName('channel')
        .setDescription('Channel to send the embed to')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true))
    .addStringOption(option => 
      option.setName('title')
        .setDescription('Title of the embed')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('description')
        .setDescription('Description of the embed')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('color')
        .setDescription('Color of the embed (hex code or "default")')
        .setRequired(false))
    .addStringOption(option => 
      option.setName('thumbnail')
        .setDescription('Thumbnail URL for the embed (or "none")')
        .setRequired(false))
    .addStringOption(option => 
      option.setName('image')
        .setDescription('Image URL for the embed (or "none")')
        .setRequired(false))
    .addStringOption(option => 
      option.setName('footer')
        .setDescription('Footer text for the embed (or "none")')
        .setRequired(false)),
  
  // Execute slash command
  async execute(client, interaction) {
    try {
      // Get options
      const channel = interaction.options.getChannel('channel');
      const title = interaction.options.getString('title');
      const description = interaction.options.getString('description');
      const color = interaction.options.getString('color') || 'default';
      const thumbnail = interaction.options.getString('thumbnail') || 'none';
      const image = interaction.options.getString('image') || 'none';
      const footer = interaction.options.getString('footer') || 'none';
      
      // Check permissions
      if (!channel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.SendMessages)) {
        return interaction.reply({ content: 'I don\'t have permission to send messages in that channel!', ephemeral: true });
      }
      
      if (!channel.permissionsFor(interaction.member).has(PermissionFlagsBits.SendMessages)) {
        return interaction.reply({ content: 'You don\'t have permission to send messages in that channel!', ephemeral: true });
      }
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description);
      
      // Set color
      if (color.toLowerCase() !== 'default') {
        embed.setColor(color);
      }
      
      // Set thumbnail
      if (thumbnail.toLowerCase() !== 'none') {
        if (urlRegex.test(thumbnail)) {
          embed.setThumbnail(thumbnail);
        } else {
          return interaction.reply({ content: 'Invalid thumbnail URL!', ephemeral: true });
        }
      }
      
      // Set image
      if (image.toLowerCase() !== 'none') {
        if (urlRegex.test(image)) {
          embed.setImage(image);
        } else {
          return interaction.reply({ content: 'Invalid image URL!', ephemeral: true });
        }
      }
      
      // Set footer
      if (footer.toLowerCase() !== 'none') {
        embed.setFooter({ text: footer });
      }
      
      // Set timestamp
      embed.setTimestamp();
      
      // Send embed
      await channel.send({ embeds: [embed] });
      await interaction.reply({ content: `Embed sent to ${channel}!`, ephemeral: true });
      
    } catch (error) {
      logger.error(`Error in embed command: ${error}`);
      await interaction.reply({ content: 'There was an error creating the embed!', ephemeral: true });
    }
  },
  
  // Execute legacy command
  async run(client, message, args) {
    try {
      // Check if user is already creating an embed
      if (embedStarted.has(message.author.id)) {
        return message.reply('You are already creating an embed! Finish or cancel that one first.');
      }
      
      // Start embed creation
      embedStarted.add(message.author.id);
      
      const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setDescription('Starting embed creation. Type `cancel` at any time to cancel.\nLet\'s start with the **title**. What would you like the title to be?');
      
      await message.channel.send({ embeds: [embed] });
      
      // Collect title
      const titleCollection = await message.channel.awaitMessages({
        filter: m => m.author.id === message.author.id,
        max: 1,
        time: 30000
      });
      
      if (!titleCollection.size) {
        embedStarted.delete(message.author.id);
        return message.channel.send('Time ran out, embed creation cancelled.');
      }
      
      const titleResponse = titleCollection.first();
      if (titleResponse.content.toLowerCase() === 'cancel') {
        embedStarted.delete(message.author.id);
        return message.channel.send('Embed creation cancelled.');
      }
      
      const title = titleResponse.content;
      
      // Ask for description
      await message.channel.send('Now, what would you like the **description** to be?');
      
      // Collect description
      const descCollection = await message.channel.awaitMessages({
        filter: m => m.author.id === message.author.id,
        max: 1,
        time: 60000
      });
      
      if (!descCollection.size) {
        embedStarted.delete(message.author.id);
        return message.channel.send('Time ran out, embed creation cancelled.');
      }
      
      const descResponse = descCollection.first();
      if (descResponse.content.toLowerCase() === 'cancel') {
        embedStarted.delete(message.author.id);
        return message.channel.send('Embed creation cancelled.');
      }
      
      const description = descResponse.content;
      
      // Ask for color
      await message.channel.send('What **color** would you like the embed to be? (hex code or type `default`)');
      
      // Collect color
      const colorCollection = await message.channel.awaitMessages({
        filter: m => m.author.id === message.author.id,
        max: 1,
        time: 30000
      });
      
      if (!colorCollection.size) {
        embedStarted.delete(message.author.id);
        return message.channel.send('Time ran out, embed creation cancelled.');
      }
      
      const colorResponse = colorCollection.first();
      if (colorResponse.content.toLowerCase() === 'cancel') {
        embedStarted.delete(message.author.id);
        return message.channel.send('Embed creation cancelled.');
      }
      
      let color = colorResponse.content.toLowerCase() === 'default' ? undefined : colorResponse.content;
      
      // Build the embed
      const finalEmbed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setTimestamp();
      
      if (color) finalEmbed.setColor(color);
      
      // Ask for channel
      await message.channel.send('Finally, which **channel** would you like to send this embed to? (mention the channel or type `here` for current channel)');
      
      // Collect channel
      const channelCollection = await message.channel.awaitMessages({
        filter: m => m.author.id === message.author.id,
        max: 1,
        time: 30000
      });
      
      if (!channelCollection.size) {
        embedStarted.delete(message.author.id);
        return message.channel.send('Time ran out, embed creation cancelled.');
      }
      
      const channelResponse = channelCollection.first();
      if (channelResponse.content.toLowerCase() === 'cancel') {
        embedStarted.delete(message.author.id);
        return message.channel.send('Embed creation cancelled.');
      }
      
      let targetChannel;
      if (channelResponse.content.toLowerCase() === 'here') {
        targetChannel = message.channel;
      } else {
        const channelMention = channelResponse.mentions.channels.first();
        const channelId = channelResponse.content.match(/\d{17,19}/);
        
        if (channelMention) {
          targetChannel = channelMention;
        } else if (channelId) {
          targetChannel = message.guild.channels.cache.get(channelId[0]);
        } else {
          embedStarted.delete(message.author.id);
          return message.channel.send('Invalid channel specified. Embed creation cancelled.');
        }
      }
      
      // Check permissions
      if (!targetChannel.permissionsFor(message.guild.members.me).has(PermissionFlagsBits.SendMessages)) {
        embedStarted.delete(message.author.id);
        return message.channel.send('I don\'t have permission to send messages in that channel!');
      }
      
      // Send the embed
      await targetChannel.send({ embeds: [finalEmbed] });
      await message.channel.send(`Embed sent to ${targetChannel}!`);
      
      // Remove user from active set
      embedStarted.delete(message.author.id);
      
    } catch (error) {
      logger.error(`Error in embed command: ${error}`);
      embedStarted.delete(message.author.id);
      await message.channel.send('There was an error creating the embed!');
    }
  }
};