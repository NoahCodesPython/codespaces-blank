const { PermissionFlagsBits } = require('discord.js');
const TempVC = require('../../models/TempVC');
const logger = require('../../utils/logger');

module.exports = {
  name: 'voiceStateUpdate',
  once: false,
  async execute(oldState, newState, client) {
    try {
      // Get settings for this guild
      const settings = await TempVC.findOne({ guildID: newState.guild.id });
      
      // If not enabled or no settings, return
      if (!settings || !settings.enabled) return;
      
      // Handle a user joining the "create" channel
      if (newState.channelId === settings.joinChannelID && oldState.channelId !== newState.channelId) {
        await handleJoinChannel(newState, settings);
      }
      
      // Handle a user leaving a temporary channel
      if (oldState.channelId && settings.tempChannels?.length > 0) {
        const tempChannel = settings.tempChannels.find(tc => tc.channelID === oldState.channelId);
        
        // If this is a temp channel and someone left it
        if (tempChannel) {
          const channel = await oldState.guild.channels.fetch(oldState.channelId).catch(() => null);
          
          // If channel exists and is now empty, delete it
          if (channel && channel.members.size === 0) {
            // Remove from the database first
            settings.tempChannels = settings.tempChannels.filter(tc => tc.channelID !== oldState.channelId);
            await settings.save();
            
            // Then delete the channel
            try {
              await channel.delete("Temporary voice channel is now empty");
              logger.debug(`Temporary voice channel ${channel.name} deleted because it became empty`);
            } catch (error) {
              logger.error(`Error deleting temporary voice channel: ${error}`);
            }
          }
        }
      }
    } catch (error) {
      logger.error(`Error in tempVC handler: ${error}`);
    }
  }
};

/**
 * Handles a user joining the "create" channel
 * @param {VoiceState} state The new voice state
 * @param {Object} settings The server's TempVC settings
 */
async function handleJoinChannel(state, settings) {
  try {
    // Get the member
    const member = state.member;
    
    // Get the category for the new channel
    let category;
    
    if (settings.categoryID) {
      category = await state.guild.channels.fetch(settings.categoryID).catch(() => null);
    }
    
    if (!category) {
      // If no category is set or it's not found, use the join channel's category
      const joinChannel = await state.guild.channels.fetch(settings.joinChannelID).catch(() => null);
      
      if (joinChannel && joinChannel.parent) {
        category = joinChannel.parent;
      }
    }
    
    // Format the channel name
    let channelName = settings.defaults.nameFormat || "{username}'s Channel";
    
    // Replace placeholders in the name
    channelName = channelName
      .replace(/{username}/g, member.user.username)
      .replace(/{game}/g, member.presence?.activities?.find(a => a.type === 0)?.name || 'Gaming')
      .replace(/{count}/g, (settings.tempChannels?.length || 0) + 1);
    
    // Create the channel
    const newChannel = await state.guild.channels.create({
      name: channelName,
      type: 2, // Voice channel
      parent: category?.id,
      userLimit: settings.defaults.userLimit || 0,
      permissionOverwrites: settings.defaults.private ? [
        {
          id: state.guild.id, // @everyone
          deny: [PermissionFlagsBits.Connect]
        },
        {
          id: member.id,
          allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.MuteMembers, PermissionFlagsBits.DeafenMembers]
        },
        {
          id: client.user.id,
          allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MuteMembers, PermissionFlagsBits.DeafenMembers]
        }
      ] : [
        {
          id: member.id, 
          allow: [PermissionFlagsBits.MuteMembers, PermissionFlagsBits.DeafenMembers]
        },
        {
          id: client.user.id,
          allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MuteMembers, PermissionFlagsBits.DeafenMembers]
        }
      ],
      reason: "Created temporary voice channel"
    });
    
    // Add to database
    if (!settings.tempChannels) settings.tempChannels = [];
    
    settings.tempChannels.push({
      channelID: newChannel.id,
      ownerID: member.id,
      createdAt: new Date()
    });
    
    await settings.save();
    
    // Move the user to the new channel
    await member.voice.setChannel(newChannel.id, "Moving to temporary voice channel");
    
    logger.debug(`Created temporary voice channel ${newChannel.name} for ${member.user.tag}`);
    
  } catch (error) {
    logger.error(`Error creating temporary voice channel: ${error}`);
  }
}