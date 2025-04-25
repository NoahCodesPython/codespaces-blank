const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const TempVC = require('../../models/TempVC');
const logger = require('../../utils/logger');

module.exports = {
  name: 'voicechannel',
  description: 'Manage your temporary voice channel',
  category: 'config',
  aliases: ['vc', 'voice', 'channel'],
  usage: '<action> [options]',
  examples: [
    'voicechannel name Gaming Session', 
    'voicechannel limit 5',
    'voicechannel lock',
    'voicechannel unlock',
    'voicechannel kick @User',
    'voicechannel claim'
  ],
  
  data: new SlashCommandBuilder()
    .setName('voicechannel')
    .setDescription('Manage your temporary voice channel')
    .addSubcommand(subcommand =>
      subcommand
        .setName('name')
        .setDescription('Change the name of your voice channel')
        .addStringOption(option =>
          option.setName('name')
            .setDescription('The new name for your voice channel')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('limit')
        .setDescription('Set a user limit for your voice channel')
        .addIntegerOption(option =>
          option.setName('limit')
            .setDescription('The user limit (0 = unlimited)')
            .setRequired(true)
            .setMinValue(0)
            .setMaxValue(99)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('lock')
        .setDescription('Lock your voice channel to prevent new users from joining'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('unlock')
        .setDescription('Unlock your voice channel to allow users to join'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('kick')
        .setDescription('Kick a user from your voice channel')
        .addUserOption(option =>
          option.setName('user')
            .setDescription('The user to kick')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('claim')
        .setDescription('Claim ownership of an abandoned voice channel')),
  
  // Slash command execution
  async execute(interaction) {
    try {
      // Get the user's voice state
      const voiceState = interaction.member.voice;
      
      // Check if user is in a voice channel
      if (!voiceState.channelId) {
        return interaction.reply({
          content: 'You need to be in a voice channel to use this command!',
          ephemeral: true
        });
      }
      
      // Get guild settings
      const settings = await TempVC.findOne({ guildID: interaction.guild.id });
      
      // Check if tempvc is enabled
      if (!settings || !settings.enabled) {
        return interaction.reply({
          content: 'Temporary voice channels are not enabled on this server.',
          ephemeral: true
        });
      }
      
      // Find if the user is in a temp voice channel
      const tempChannel = settings.tempChannels.find(tc => tc.channelID === voiceState.channelId);
      
      if (!tempChannel) {
        return interaction.reply({
          content: 'You are not in a temporary voice channel!',
          ephemeral: true
        });
      }
      
      // Get the voice channel
      const voiceChannel = await interaction.guild.channels.fetch(voiceState.channelId);
      
      if (!voiceChannel) {
        return interaction.reply({
          content: 'Your voice channel could not be found!',
          ephemeral: true
        });
      }
      
      // Check if user is the owner or has permission
      const isOwner = tempChannel.ownerID === interaction.user.id;
      const hasPermission = isOwner || interaction.member.permissions.has(PermissionFlagsBits.ManageChannels);
      
      if (!hasPermission) {
        // Handle claim command
        if (interaction.options.getSubcommand() === 'claim') {
          // Check if the owner is still in the channel
          const owner = voiceChannel.members.get(tempChannel.ownerID);
          
          if (owner) {
            return interaction.reply({
              content: `You cannot claim this channel because the owner <@${tempChannel.ownerID}> is still in the channel!`,
              ephemeral: true
            });
          }
          
          // Claim the channel
          tempChannel.ownerID = interaction.user.id;
          await settings.save();
          
          return interaction.reply(`You have claimed ownership of this voice channel!`);
        }
        
        return interaction.reply({
          content: 'You do not have permission to manage this voice channel!',
          ephemeral: true
        });
      }
      
      const subcommand = interaction.options.getSubcommand();
      
      switch (subcommand) {
        case 'name': {
          const name = interaction.options.getString('name');
          
          // Validate name
          if (name.length > 100) {
            return interaction.reply({
              content: 'Channel name cannot be longer than 100 characters!',
              ephemeral: true
            });
          }
          
          // Update channel name
          await voiceChannel.setName(name, 'Temporary voice channel name changed by owner');
          
          await interaction.reply(`Voice channel name changed to **${name}**!`);
          break;
        }
        case 'limit': {
          const limit = interaction.options.getInteger('limit');
          
          // Update user limit
          await voiceChannel.setUserLimit(limit, 'Temporary voice channel limit changed by owner');
          
          await interaction.reply(`Voice channel user limit set to **${limit === 0 ? 'unlimited' : limit}**!`);
          break;
        }
        case 'lock': {
          // Update channel permissions
          await voiceChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
            Connect: false
          }, { reason: 'Temporary voice channel locked by owner' });
          
          await interaction.reply('Voice channel locked! New users can no longer join.');
          break;
        }
        case 'unlock': {
          // Update channel permissions
          await voiceChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
            Connect: null
          }, { reason: 'Temporary voice channel unlocked by owner' });
          
          await interaction.reply('Voice channel unlocked! Users can now join.');
          break;
        }
        case 'kick': {
          const user = interaction.options.getUser('user');
          const member = await interaction.guild.members.fetch(user.id).catch(() => null);
          
          if (!member) {
            return interaction.reply({
              content: 'User not found!',
              ephemeral: true
            });
          }
          
          // Check if user is in the voice channel
          if (member.voice.channelId !== voiceChannel.id) {
            return interaction.reply({
              content: 'That user is not in your voice channel!',
              ephemeral: true
            });
          }
          
          // Don't allow kicking the owner
          if (member.id === tempChannel.ownerID) {
            return interaction.reply({
              content: 'You cannot kick the owner of the voice channel!',
              ephemeral: true
            });
          }
          
          // Kick the user
          await member.voice.disconnect('Kicked from temporary voice channel by owner');
          
          await interaction.reply(`**${member.user.tag}** has been kicked from your voice channel!`);
          break;
        }
        case 'claim': {
          // Already handled above, but just in case
          await interaction.reply('You already own this voice channel!');
          break;
        }
      }
      
    } catch (error) {
      logger.error(`Error in voicechannel command: ${error}`);
      await interaction.reply({
        content: 'There was an error managing your voice channel!',
        ephemeral: true
      });
    }
  },
  
  // Legacy command execution
  async run(client, message, args) {
    try {
      // Get the user's voice state
      const voiceState = message.member.voice;
      
      // Check if user is in a voice channel
      if (!voiceState.channelId) {
        return message.reply('You need to be in a voice channel to use this command!');
      }
      
      // Check if arguments were provided
      if (!args.length) {
        return message.reply('Please specify an action: `name`, `limit`, `lock`, `unlock`, `kick`, or `claim`!');
      }
      
      // Get guild settings
      const settings = await TempVC.findOne({ guildID: message.guild.id });
      
      // Check if tempvc is enabled
      if (!settings || !settings.enabled) {
        return message.reply('Temporary voice channels are not enabled on this server.');
      }
      
      // Find if the user is in a temp voice channel
      const tempChannel = settings.tempChannels.find(tc => tc.channelID === voiceState.channelId);
      
      if (!tempChannel) {
        return message.reply('You are not in a temporary voice channel!');
      }
      
      // Get the voice channel
      const voiceChannel = await message.guild.channels.fetch(voiceState.channelId);
      
      if (!voiceChannel) {
        return message.reply('Your voice channel could not be found!');
      }
      
      // Check if user is the owner or has permission
      const isOwner = tempChannel.ownerID === message.author.id;
      const hasPermission = isOwner || message.member.permissions.has(PermissionFlagsBits.ManageChannels);
      
      if (!hasPermission) {
        // Handle claim command
        if (args[0].toLowerCase() === 'claim') {
          // Check if the owner is still in the channel
          const owner = voiceChannel.members.get(tempChannel.ownerID);
          
          if (owner) {
            return message.reply(`You cannot claim this channel because the owner <@${tempChannel.ownerID}> is still in the channel!`);
          }
          
          // Claim the channel
          tempChannel.ownerID = message.author.id;
          await settings.save();
          
          return message.reply('You have claimed ownership of this voice channel!');
        }
        
        return message.reply('You do not have permission to manage this voice channel!');
      }
      
      const action = args[0].toLowerCase();
      
      switch (action) {
        case 'name': {
          // Get the new name
          if (args.length < 2) {
            return message.reply('Please provide a new name for your voice channel!');
          }
          
          const name = args.slice(1).join(' ');
          
          // Validate name
          if (name.length > 100) {
            return message.reply('Channel name cannot be longer than 100 characters!');
          }
          
          // Update channel name
          await voiceChannel.setName(name, 'Temporary voice channel name changed by owner');
          
          await message.reply(`Voice channel name changed to **${name}**!`);
          break;
        }
        case 'limit': {
          // Get the new limit
          if (args.length < 2) {
            return message.reply('Please provide a user limit for your voice channel!');
          }
          
          const limit = parseInt(args[1]);
          
          if (isNaN(limit) || limit < 0 || limit > 99) {
            return message.reply('User limit must be a number between 0 and 99! (0 = unlimited)');
          }
          
          // Update user limit
          await voiceChannel.setUserLimit(limit, 'Temporary voice channel limit changed by owner');
          
          await message.reply(`Voice channel user limit set to **${limit === 0 ? 'unlimited' : limit}**!`);
          break;
        }
        case 'lock': {
          // Update channel permissions
          await voiceChannel.permissionOverwrites.edit(message.guild.roles.everyone, {
            Connect: false
          }, { reason: 'Temporary voice channel locked by owner' });
          
          await message.reply('Voice channel locked! New users can no longer join.');
          break;
        }
        case 'unlock': {
          // Update channel permissions
          await voiceChannel.permissionOverwrites.edit(message.guild.roles.everyone, {
            Connect: null
          }, { reason: 'Temporary voice channel unlocked by owner' });
          
          await message.reply('Voice channel unlocked! Users can now join.');
          break;
        }
        case 'kick': {
          // Get the user to kick
          if (args.length < 2) {
            return message.reply('Please mention a user to kick from your voice channel!');
          }
          
          // Get the user from mention
          const userId = args[1].replace(/[<@!>]/g, '');
          const member = await message.guild.members.fetch(userId).catch(() => null);
          
          if (!member) {
            return message.reply('User not found!');
          }
          
          // Check if user is in the voice channel
          if (member.voice.channelId !== voiceChannel.id) {
            return message.reply('That user is not in your voice channel!');
          }
          
          // Don't allow kicking the owner
          if (member.id === tempChannel.ownerID) {
            return message.reply('You cannot kick the owner of the voice channel!');
          }
          
          // Kick the user
          await member.voice.disconnect('Kicked from temporary voice channel by owner');
          
          await message.reply(`**${member.user.tag}** has been kicked from your voice channel!`);
          break;
        }
        case 'claim': {
          // Already handled above, but just in case
          await message.reply('You already own this voice channel!');
          break;
        }
        default: {
          await message.reply('Unknown action. Available actions: `name`, `limit`, `lock`, `unlock`, `kick`, or `claim`!');
          break;
        }
      }
      
    } catch (error) {
      logger.error(`Error in legacy voicechannel command: ${error}`);
      message.reply('There was an error managing your voice channel!');
    }
  }
};