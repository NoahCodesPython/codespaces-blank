const { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const Guild = require('../../models/Guild');
const logger = require('../../utils/logger');

module.exports = {
  name: 'welcome',
  description: 'Configure the welcome message system',
  category: 'config',
  aliases: ['setwelcome', 'welcomemsg'],
  usage: '<set/disable/test> [channel] [message]',
  examples: ['welcome set #welcome Welcome {user}!', 'welcome disable', 'welcome test'],
  userPermissions: [PermissionFlagsBits.ManageGuild],
  botPermissions: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks],
  
  data: new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Configure the welcome message system')
    .addSubcommand(subcommand =>
      subcommand
        .setName('set')
        .setDescription('Set up welcome messages')
        .addChannelOption(option => 
          option.setName('channel')
            .setDescription('The channel to send welcome messages to')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true))
        .addStringOption(option => 
          option.setName('message')
            .setDescription('The welcome message to send')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('disable')
        .setDescription('Disable welcome messages'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('test')
        .setDescription('Test the welcome message'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View the current welcome message configuration'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  
  // Slash command execution
  async execute(interaction) {
    try {
      const subcommand = interaction.options.getSubcommand();
      
      // Handle different subcommands
      if (subcommand === 'set') {
        await setWelcomeMessage(interaction);
      } else if (subcommand === 'disable') {
        await disableWelcomeMessage(interaction);
      } else if (subcommand === 'test') {
        await testWelcomeMessage(interaction);
      } else if (subcommand === 'view') {
        await viewWelcomeConfig(interaction);
      }
      
    } catch (error) {
      logger.error(`Error executing welcome command: ${error}`);
      await interaction.reply({ 
        content: 'There was an error executing this command!', 
        ephemeral: true 
      });
    }
  },
  
  // Legacy command execution
  async run(client, message, args) {
    try {
      if (!args.length) {
        return await legacyViewWelcomeConfig(message);
      }
      
      const action = args[0].toLowerCase();
      
      if (action === 'set') {
        if (args.length < 3) {
          return message.reply('Please provide both a channel and a message. Example: `welcome set #channel Hello {user}!`');
        }
        
        // Get channel from mention or ID
        const channelMention = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]);
        
        if (!channelMention) {
          return message.reply('Please provide a valid channel.');
        }
        
        // Extract the welcome message
        const welcomeMessage = args.slice(2).join(' ');
        
        await legacySetWelcomeMessage(message, channelMention, welcomeMessage);
        
      } else if (action === 'disable') {
        await legacyDisableWelcomeMessage(message);
      } else if (action === 'test') {
        await legacyTestWelcomeMessage(message);
      } else if (action === 'view') {
        await legacyViewWelcomeConfig(message);
      } else {
        message.reply('Invalid option. Use `set`, `disable`, `test`, or `view`.');
      }
      
    } catch (error) {
      logger.error(`Error executing welcome command: ${error}`);
      message.reply('There was an error executing this command!');
    }
  }
};

// Set welcome message (slash command)
async function setWelcomeMessage(interaction) {
  const channel = interaction.options.getChannel('channel');
  const welcomeMessage = interaction.options.getString('message');
  
  // Check if channel is text-based
  if (channel.type !== ChannelType.GuildText) {
    return interaction.reply({
      content: 'Please select a text channel.',
      ephemeral: true
    });
  }
  
  // Check if bot has permission to send messages in the channel
  if (!channel.permissionsFor(interaction.client.user).has(PermissionFlagsBits.SendMessages)) {
    return interaction.reply({
      content: `I don't have permission to send messages in ${channel}.`,
      ephemeral: true
    });
  }
  
  // Update or create guild settings
  let guildSettings = await Guild.findOne({ guildID: interaction.guild.id });
  
  if (!guildSettings) {
    guildSettings = new Guild({
      guildID: interaction.guild.id,
      welcomeChannel: channel.id,
      welcomeMessage: welcomeMessage
    });
  } else {
    guildSettings.welcomeChannel = channel.id;
    guildSettings.welcomeMessage = welcomeMessage;
  }
  
  await guildSettings.save();
  
  // Create response embed
  const embed = new EmbedBuilder()
    .setTitle('Welcome Message Set')
    .setDescription(`Welcome messages will now be sent to ${channel}.`)
    .addFields({ name: 'Message', value: welcomeMessage })
    .addFields({ 
      name: 'Available Variables', 
      value: '`{user}` - Mentions the user\n`{username}` - Username without mention\n`{server}` - Server name\n`{membercount}` - Server member count' 
    })
    .setColor('#00FF00')
    .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
    .setTimestamp();
  
  await interaction.reply({ embeds: [embed] });
}

// Disable welcome message (slash command)
async function disableWelcomeMessage(interaction) {
  // Update guild settings
  let guildSettings = await Guild.findOne({ guildID: interaction.guild.id });
  
  if (!guildSettings) {
    return interaction.reply({
      content: 'Welcome messages are not set up for this server.',
      ephemeral: true
    });
  }
  
  // Check if welcome messages are already disabled
  if (!guildSettings.welcomeChannel) {
    return interaction.reply({
      content: 'Welcome messages are already disabled.',
      ephemeral: true
    });
  }
  
  // Disable welcome messages
  guildSettings.welcomeChannel = null;
  await guildSettings.save();
  
  // Create response embed
  const embed = new EmbedBuilder()
    .setTitle('Welcome Messages Disabled')
    .setDescription('Welcome messages have been disabled for this server.')
    .setColor('#FF0000')
    .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
    .setTimestamp();
  
  await interaction.reply({ embeds: [embed] });
}

// Test welcome message (slash command)
async function testWelcomeMessage(interaction) {
  // Get guild settings
  const guildSettings = await Guild.findOne({ guildID: interaction.guild.id });
  
  if (!guildSettings || !guildSettings.welcomeChannel || !guildSettings.welcomeMessage) {
    return interaction.reply({
      content: 'Welcome messages are not set up for this server.',
      ephemeral: true
    });
  }
  
  // Get the welcome channel
  const welcomeChannel = interaction.guild.channels.cache.get(guildSettings.welcomeChannel);
  
  if (!welcomeChannel) {
    return interaction.reply({
      content: 'The welcome channel no longer exists. Please set up welcome messages again.',
      ephemeral: true
    });
  }
  
  // Parse the welcome message
  let welcomeMessage = guildSettings.welcomeMessage;
  welcomeMessage = welcomeMessage.replace(/{user}/g, `<@${interaction.user.id}>`);
  welcomeMessage = welcomeMessage.replace(/{username}/g, interaction.user.username);
  welcomeMessage = welcomeMessage.replace(/{server}/g, interaction.guild.name);
  welcomeMessage = welcomeMessage.replace(/{membercount}/g, interaction.guild.memberCount);
  
  // Send the test message
  try {
    await welcomeChannel.send(welcomeMessage);
    
    // Create response embed
    const embed = new EmbedBuilder()
      .setTitle('Welcome Message Test')
      .setDescription(`Test welcome message sent to ${welcomeChannel}.`)
      .setColor('#00FF00')
      .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
    
  } catch (error) {
    logger.error(`Error sending test welcome message: ${error}`);
    await interaction.reply({
      content: `Could not send test message to ${welcomeChannel}. Please check my permissions.`,
      ephemeral: true
    });
  }
}

// View welcome config (slash command)
async function viewWelcomeConfig(interaction) {
  // Get guild settings
  const guildSettings = await Guild.findOne({ guildID: interaction.guild.id });
  
  if (!guildSettings || !guildSettings.welcomeChannel) {
    return interaction.reply({
      content: 'Welcome messages are not set up for this server.',
      ephemeral: true
    });
  }
  
  // Get the welcome channel
  const welcomeChannel = interaction.guild.channels.cache.get(guildSettings.welcomeChannel);
  
  // Create response embed
  const embed = new EmbedBuilder()
    .setTitle('Welcome Message Configuration')
    .addFields({ 
      name: 'Welcome Channel', 
      value: welcomeChannel ? `${welcomeChannel}` : 'Channel not found'
    })
    .addFields({ 
      name: 'Welcome Message', 
      value: guildSettings.welcomeMessage || 'No message set'
    })
    .addFields({ 
      name: 'Available Variables', 
      value: '`{user}` - Mentions the user\n`{username}` - Username without mention\n`{server}` - Server name\n`{membercount}` - Server member count' 
    })
    .setColor('#3498db')
    .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
    .setTimestamp();
  
  await interaction.reply({ embeds: [embed] });
}

// Set welcome message (legacy command)
async function legacySetWelcomeMessage(message, channel, welcomeMessage) {
  // Check if channel is text-based
  if (channel.type !== ChannelType.GuildText) {
    return message.reply('Please select a text channel.');
  }
  
  // Check if bot has permission to send messages in the channel
  if (!channel.permissionsFor(message.client.user).has(PermissionFlagsBits.SendMessages)) {
    return message.reply(`I don't have permission to send messages in ${channel}.`);
  }
  
  // Update or create guild settings
  let guildSettings = await Guild.findOne({ guildID: message.guild.id });
  
  if (!guildSettings) {
    guildSettings = new Guild({
      guildID: message.guild.id,
      welcomeChannel: channel.id,
      welcomeMessage: welcomeMessage
    });
  } else {
    guildSettings.welcomeChannel = channel.id;
    guildSettings.welcomeMessage = welcomeMessage;
  }
  
  await guildSettings.save();
  
  // Create response embed
  const embed = new EmbedBuilder()
    .setTitle('Welcome Message Set')
    .setDescription(`Welcome messages will now be sent to ${channel}.`)
    .addFields({ name: 'Message', value: welcomeMessage })
    .addFields({ 
      name: 'Available Variables', 
      value: '`{user}` - Mentions the user\n`{username}` - Username without mention\n`{server}` - Server name\n`{membercount}` - Server member count' 
    })
    .setColor('#00FF00')
    .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) })
    .setTimestamp();
  
  await message.reply({ embeds: [embed] });
}

// Disable welcome message (legacy command)
async function legacyDisableWelcomeMessage(message) {
  // Update guild settings
  let guildSettings = await Guild.findOne({ guildID: message.guild.id });
  
  if (!guildSettings) {
    return message.reply('Welcome messages are not set up for this server.');
  }
  
  // Check if welcome messages are already disabled
  if (!guildSettings.welcomeChannel) {
    return message.reply('Welcome messages are already disabled.');
  }
  
  // Disable welcome messages
  guildSettings.welcomeChannel = null;
  await guildSettings.save();
  
  // Create response embed
  const embed = new EmbedBuilder()
    .setTitle('Welcome Messages Disabled')
    .setDescription('Welcome messages have been disabled for this server.')
    .setColor('#FF0000')
    .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) })
    .setTimestamp();
  
  await message.reply({ embeds: [embed] });
}

// Test welcome message (legacy command)
async function legacyTestWelcomeMessage(message) {
  // Get guild settings
  const guildSettings = await Guild.findOne({ guildID: message.guild.id });
  
  if (!guildSettings || !guildSettings.welcomeChannel || !guildSettings.welcomeMessage) {
    return message.reply('Welcome messages are not set up for this server.');
  }
  
  // Get the welcome channel
  const welcomeChannel = message.guild.channels.cache.get(guildSettings.welcomeChannel);
  
  if (!welcomeChannel) {
    return message.reply('The welcome channel no longer exists. Please set up welcome messages again.');
  }
  
  // Parse the welcome message
  let welcomeMessage = guildSettings.welcomeMessage;
  welcomeMessage = welcomeMessage.replace(/{user}/g, `<@${message.author.id}>`);
  welcomeMessage = welcomeMessage.replace(/{username}/g, message.author.username);
  welcomeMessage = welcomeMessage.replace(/{server}/g, message.guild.name);
  welcomeMessage = welcomeMessage.replace(/{membercount}/g, message.guild.memberCount);
  
  // Send the test message
  try {
    await welcomeChannel.send(welcomeMessage);
    
    // Create response embed
    const embed = new EmbedBuilder()
      .setTitle('Welcome Message Test')
      .setDescription(`Test welcome message sent to ${welcomeChannel}.`)
      .setColor('#00FF00')
      .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) })
      .setTimestamp();
    
    await message.reply({ embeds: [embed] });
    
  } catch (error) {
    logger.error(`Error sending test welcome message: ${error}`);
    message.reply(`Could not send test message to ${welcomeChannel}. Please check my permissions.`);
  }
}

// View welcome config (legacy command)
async function legacyViewWelcomeConfig(message) {
  // Get guild settings
  const guildSettings = await Guild.findOne({ guildID: message.guild.id });
  
  if (!guildSettings || !guildSettings.welcomeChannel) {
    return message.reply('Welcome messages are not set up for this server.');
  }
  
  // Get the welcome channel
  const welcomeChannel = message.guild.channels.cache.get(guildSettings.welcomeChannel);
  
  // Create response embed
  const embed = new EmbedBuilder()
    .setTitle('Welcome Message Configuration')
    .addFields({ 
      name: 'Welcome Channel', 
      value: welcomeChannel ? `${welcomeChannel}` : 'Channel not found'
    })
    .addFields({ 
      name: 'Welcome Message', 
      value: guildSettings.welcomeMessage || 'No message set'
    })
    .addFields({ 
      name: 'Available Variables', 
      value: '`{user}` - Mentions the user\n`{username}` - Username without mention\n`{server}` - Server name\n`{membercount}` - Server member count' 
    })
    .setColor('#3498db')
    .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) })
    .setTimestamp();
  
  await message.reply({ embeds: [embed] });
}