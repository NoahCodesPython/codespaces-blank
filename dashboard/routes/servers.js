const express = require('express');
const router = express.Router();
const { isAuthenticated, hasGuildPermission } = require('../middleware/auth');

// Import Discord client
const { client } = require('../../index');

// Import database models
const Guild = require('../../src/models/Guild');
const TempVC = require('../../src/models/TempVC');
const SuggestionSettings = require('../../src/models/SuggestionSettings');
const AutoResponse = require('../../src/models/AutoResponse');
const CustomCommand = require('../../src/models/CustomCommand');
const AltDetector = require('../../src/models/AltDetector');

/**
 * Server management home route
 * Shows server overview and configuration options
 */
router.get('/:id', hasGuildPermission, async (req, res) => {
  try {
    const guildId = req.params.id;
    const guild = req.user.guilds.find(g => g.id === guildId);
    
    // Placeholder for guild settings
    // In a production environment, fetch these from the database
    const settings = {
      prefix: '!',
      welcome: {
        enabled: false,
        channel: null,
        message: 'Welcome {user} to {server}!'
      },
      antiInvite: false,
      antiLink: false
    };
    
    res.render('pages/server-manage', {
      title: guild.name,
      guild,
      settings
    });
  } catch (err) {
    console.error('Error fetching server data:', err);
    res.status(500).render('pages/error', {
      title: 'Error',
      error: {
        status: 500,
        message: 'Failed to load server data. Please try again later.'
      }
    });
  }
});

/**
 * Server settings route
 * For configuring general bot settings
 */
router.get('/:id/settings', hasGuildPermission, async (req, res) => {
  try {
    const guildId = req.params.id;
    const guild = req.user.guilds.find(g => g.id === guildId);
    
    // Placeholder for guild settings
    // In a production environment, fetch these from the database
    const settings = {
      prefix: '!',
      welcome: {
        enabled: false,
        channel: null,
        message: 'Welcome {user} to {server}!'
      },
      antiInvite: false,
      antiLink: false
    };
    
    res.render('pages/server-settings', {
      title: `${guild.name} - Settings`,
      guild,
      settings
    });
  } catch (err) {
    console.error('Error fetching server settings:', err);
    res.status(500).render('pages/error', {
      title: 'Error',
      error: {
        status: 500,
        message: 'Failed to load server settings. Please try again later.'
      }
    });
  }
});

/**
 * Save server settings route
 */
router.post('/:id/settings', hasGuildPermission, async (req, res) => {
  try {
    const guildId = req.params.id;
    const { prefix, welcomeEnabled, welcomeChannel, welcomeMessage, antiInvite, antiLink } = req.body;
    
    // In a production environment, save these to the database
    
    // Redirect back to settings page
    res.redirect(`/servers/${guildId}/settings`);
  } catch (err) {
    console.error('Error saving server settings:', err);
    res.status(500).render('pages/error', {
      title: 'Error',
      error: {
        status: 500,
        message: 'Failed to save server settings. Please try again later.'
      }
    });
  }
});

/**
 * Welcome message configuration route
 */
router.get('/:id/welcome', hasGuildPermission, async (req, res) => {
  try {
    const guildId = req.params.id;
    const guild = req.user.guilds.find(g => g.id === guildId);
    
    // Check if the bot is in the guild
    const discordGuild = client.guilds.cache.get(guildId);
    if (!discordGuild) {
      return res.status(404).render('pages/error', {
        title: 'Error',
        error: {
          status: 404,
          message: 'Bot is not in this server. Please add the bot to the server first.'
        }
      });
    }
    
    // Get guild settings from database
    let guildData = await Guild.findOne({ guildId });
    
    if (!guildData) {
      // Create default settings if none exist
      guildData = new Guild({
        guildId,
        prefix: client.config.prefix,
        welcome: {
          enabled: false,
          channel: null,
          message: 'Welcome {user} to {server}!'
        },
        antiInvite: false,
        antiLink: false
      });
      
      await guildData.save();
    }
    
    // Get channels for the dropdown
    const channels = discordGuild.channels.cache
      .filter(c => c.type === 0) // Text channels only
      .map(c => ({
        id: c.id,
        name: c.name
      }));
    
    res.render('pages/welcome', {
      title: `${guild.name} - Welcome System`,
      guild,
      settings: guildData,
      channels
    });
  } catch (err) {
    console.error('Error fetching welcome settings:', err);
    res.status(500).render('pages/error', {
      title: 'Error',
      error: {
        status: 500,
        message: 'Failed to load welcome settings. Please try again later.'
      }
    });
  }
});

/**
 * Save welcome message configuration route
 */
router.post('/:id/welcome', hasGuildPermission, async (req, res) => {
  try {
    const guildId = req.params.id;
    const { welcomeEnabled, welcomeChannel, welcomeMessage, testWelcome } = req.body;
    
    // Get guild settings from database or create new ones
    let guildData = await Guild.findOne({ guildId });
    
    if (!guildData) {
      guildData = new Guild({
        guildId,
        prefix: client.config.prefix
      });
    }
    
    // Update welcome settings
    guildData.welcome = {
      enabled: welcomeEnabled === 'on',
      channel: welcomeChannel,
      message: welcomeMessage
    };
    
    await guildData.save();
    
    // Test welcome message if requested
    if (testWelcome === 'on') {
      try {
        const channel = client.channels.cache.get(welcomeChannel);
        if (channel) {
          const member = client.guilds.cache.get(guildId).members.cache.get(req.user.id);
          const welcomeMsg = welcomeMessage
            .replace(/{user}/g, `<@${member.id}>`)
            .replace(/{username}/g, member.user.username)
            .replace(/{server}/g, client.guilds.cache.get(guildId).name)
            .replace(/{membercount}/g, client.guilds.cache.get(guildId).memberCount);
          
          await channel.send(welcomeMsg);
        }
      } catch (testError) {
        console.error('Error sending test welcome message:', testError);
      }
    }
    
    // Redirect back to welcome page
    res.redirect(`/servers/${guildId}/welcome`);
  } catch (err) {
    console.error('Error saving welcome settings:', err);
    res.status(500).render('pages/error', {
      title: 'Error',
      error: {
        status: 500,
        message: 'Failed to save welcome settings. Please try again later.'
      }
    });
  }
});

/**
 * Auto responses configuration route
 */
router.get('/:id/auto-responses', hasGuildPermission, async (req, res) => {
  try {
    const guildId = req.params.id;
    const guild = req.user.guilds.find(g => g.id === guildId);
    
    // Check if the bot is in the guild
    const discordGuild = client.guilds.cache.get(guildId);
    if (!discordGuild) {
      return res.status(404).render('pages/error', {
        title: 'Error',
        error: {
          status: 404,
          message: 'Bot is not in this server. Please add the bot to the server first.'
        }
      });
    }
    
    // Get guild settings from database
    let guildData = await Guild.findOne({ guildId });
    
    if (!guildData) {
      guildData = new Guild({
        guildId,
        prefix: client.config.prefix
      });
      await guildData.save();
    }
    
    // Get auto responses from database
    const autoResponses = await AutoResponse.find({ guildId });
    
    res.render('pages/auto-responses', {
      title: `${guild.name} - Auto Responses`,
      guild,
      settings: guildData,
      autoResponses
    });
  } catch (err) {
    console.error('Error fetching auto responses:', err);
    res.status(500).render('pages/error', {
      title: 'Error',
      error: {
        status: 500,
        message: 'Failed to load auto responses. Please try again later.'
      }
    });
  }
});

/**
 * Create auto response route
 */
router.post('/:id/auto-responses', hasGuildPermission, async (req, res) => {
  try {
    const guildId = req.params.id;
    const { trigger, response } = req.body;
    
    // Input validation
    if (!trigger || !response) {
      return res.status(400).render('pages/error', {
        title: 'Error',
        error: {
          status: 400,
          message: 'Trigger and response are required.'
        }
      });
    }
    
    // Create auto response
    const autoResponse = new AutoResponse({
      guildId,
      trigger,
      response,
      createdBy: req.user.id
    });
    
    await autoResponse.save();
    
    // Redirect back to auto responses page
    res.redirect(`/servers/${guildId}/auto-responses`);
  } catch (err) {
    console.error('Error creating auto response:', err);
    res.status(500).render('pages/error', {
      title: 'Error',
      error: {
        status: 500,
        message: 'Failed to create auto response. Please try again later.'
      }
    });
  }
});

/**
 * Delete auto response route
 */
router.post('/:id/auto-responses/:responseId/delete', hasGuildPermission, async (req, res) => {
  try {
    const guildId = req.params.id;
    const responseId = req.params.responseId;
    
    // Delete auto response from database
    await AutoResponse.findByIdAndDelete(responseId);
    
    // Redirect back to auto responses page
    res.redirect(`/servers/${guildId}/auto-responses`);
  } catch (err) {
    console.error('Error deleting auto response:', err);
    res.status(500).render('pages/error', {
      title: 'Error',
      error: {
        status: 500,
        message: 'Failed to delete auto response. Please try again later.'
      }
    });
  }
});

/**
 * Temporary voice channels configuration route
 */
router.get('/:id/temp-vc', hasGuildPermission, async (req, res) => {
  try {
    const guildId = req.params.id;
    const guild = req.user.guilds.find(g => g.id === guildId);
    
    // Check if the bot is in the guild
    const discordGuild = client.guilds.cache.get(guildId);
    if (!discordGuild) {
      return res.status(404).render('pages/error', {
        title: 'Error',
        error: {
          status: 404,
          message: 'Bot is not in this server. Please add the bot to the server first.'
        }
      });
    }
    
    // Get temp VC settings from database
    let tempVCSettings = await TempVC.findOne({ guildId });
    
    if (!tempVCSettings) {
      // Create default settings if none exist
      tempVCSettings = new TempVC({
        guildId,
        enabled: false,
        channelId: null,
        categoryId: null,
        nameFormat: '{username}\'s channel'
      });
      
      await tempVCSettings.save();
    }
    
    // Get voice channels for the dropdown
    const voiceChannels = discordGuild.channels.cache
      .filter(c => c.type === 2) // Voice channels only
      .map(c => ({
        id: c.id,
        name: c.name
      }));
    
    // Get categories for the dropdown
    const categories = discordGuild.channels.cache
      .filter(c => c.type === 4) // Categories only
      .map(c => ({
        id: c.id,
        name: c.name
      }));
    
    res.render('pages/temp-vc', {
      title: `${guild.name} - Voice Channels`,
      guild,
      tempVCSettings,
      voiceChannels,
      categories
    });
  } catch (err) {
    console.error('Error fetching temp VC settings:', err);
    res.status(500).render('pages/error', {
      title: 'Error',
      error: {
        status: 500,
        message: 'Failed to load voice channel settings. Please try again later.'
      }
    });
  }
});

/**
 * Save temporary voice channels configuration route
 */
router.post('/:id/temp-vc', hasGuildPermission, async (req, res) => {
  try {
    const guildId = req.params.id;
    const { enabled, channelId, categoryId, nameFormat } = req.body;
    
    // Input validation
    if (enabled === 'on' && !channelId) {
      return res.status(400).render('pages/error', {
        title: 'Error',
        error: {
          status: 400,
          message: 'Join channel is required when enabling temporary voice channels.'
        }
      });
    }
    
    // Get temp VC settings from database or create new ones
    let tempVCSettings = await TempVC.findOne({ guildId });
    
    if (!tempVCSettings) {
      tempVCSettings = new TempVC({
        guildId
      });
    }
    
    // Update temp VC settings
    tempVCSettings.enabled = enabled === 'on';
    tempVCSettings.channelId = channelId;
    tempVCSettings.categoryId = categoryId || null;
    tempVCSettings.nameFormat = nameFormat || '{username}\'s channel';
    
    await tempVCSettings.save();
    
    // Redirect back to temp VC page
    res.redirect(`/servers/${guildId}/temp-vc`);
  } catch (err) {
    console.error('Error saving temp VC settings:', err);
    res.status(500).render('pages/error', {
      title: 'Error',
      error: {
        status: 500,
        message: 'Failed to save voice channel settings. Please try again later.'
      }
    });
  }
});

/**
 * Suggestions configuration route
 */
router.get('/:id/suggestions', hasGuildPermission, async (req, res) => {
  try {
    const guildId = req.params.id;
    const guild = req.user.guilds.find(g => g.id === guildId);
    
    // Check if the bot is in the guild
    const discordGuild = client.guilds.cache.get(guildId);
    if (!discordGuild) {
      return res.status(404).render('pages/error', {
        title: 'Error',
        error: {
          status: 404,
          message: 'Bot is not in this server. Please add the bot to the server first.'
        }
      });
    }
    
    // Get suggestion settings from database
    let suggestionSettings = await SuggestionSettings.findOne({ guildId });
    
    if (!suggestionSettings) {
      // Create default settings if none exist
      suggestionSettings = new SuggestionSettings({
        guildId,
        enabled: false,
        suggestionChannel: null
      });
      
      await suggestionSettings.save();
    }
    
    // Get text channels for the dropdown
    const textChannels = discordGuild.channels.cache
      .filter(c => c.type === 0) // Text channels only
      .map(c => ({
        id: c.id,
        name: c.name
      }));
    
    res.render('pages/suggestions', {
      title: `${guild.name} - Suggestions`,
      guild,
      suggestionSettings,
      channels: textChannels
    });
  } catch (err) {
    console.error('Error fetching suggestion settings:', err);
    res.status(500).render('pages/error', {
      title: 'Error',
      error: {
        status: 500,
        message: 'Failed to load suggestion settings. Please try again later.'
      }
    });
  }
});

/**
 * Save suggestions configuration route
 */
router.post('/:id/suggestions', hasGuildPermission, async (req, res) => {
  try {
    const guildId = req.params.id;
    const { enabled, suggestionChannel } = req.body;
    
    // Input validation
    if (enabled === 'on' && !suggestionChannel) {
      return res.status(400).render('pages/error', {
        title: 'Error',
        error: {
          status: 400,
          message: 'Suggestion channel is required when enabling suggestions.'
        }
      });
    }
    
    // Get suggestion settings from database or create new ones
    let suggestionSettings = await SuggestionSettings.findOne({ guildId });
    
    if (!suggestionSettings) {
      suggestionSettings = new SuggestionSettings({
        guildId
      });
    }
    
    // Update suggestion settings
    suggestionSettings.enabled = enabled === 'on';
    suggestionSettings.suggestionChannel = suggestionChannel;
    
    await suggestionSettings.save();
    
    // Redirect back to suggestions page
    res.redirect(`/servers/${guildId}/suggestions`);
  } catch (err) {
    console.error('Error saving suggestion settings:', err);
    res.status(500).render('pages/error', {
      title: 'Error',
      error: {
        status: 500,
        message: 'Failed to save suggestion settings. Please try again later.'
      }
    });
  }
});

/**
 * Moderation configuration route
 */
router.get('/:id/moderation', hasGuildPermission, async (req, res) => {
  try {
    const guildId = req.params.id;
    const guild = req.user.guilds.find(g => g.id === guildId);
    
    // Placeholder for moderation settings
    // In a production environment, fetch these from the database
    const modSettings = {
      modLogChannel: null,
      warnThreshold: 3,
      thresholdAction: 'none',
      muteDuration: 60,
      exemptRoles: [],
      exemptChannels: []
    };
    
    // Placeholder for alt detector settings
    // In a production environment, fetch these from the database
    const altSettings = {
      enabled: false,
      minAge: 7,
      action: 'log',
      modLogChannel: null,
      bypassRoles: []
    };
    
    res.render('pages/moderation', {
      title: `${guild.name} - Moderation`,
      guild,
      modSettings,
      altSettings
    });
  } catch (err) {
    console.error('Error fetching moderation settings:', err);
    res.status(500).render('pages/error', {
      title: 'Error',
      error: {
        status: 500,
        message: 'Failed to load moderation settings. Please try again later.'
      }
    });
  }
});

/**
 * Save moderation configuration route
 */
router.post('/:id/moderation/automod', hasGuildPermission, async (req, res) => {
  try {
    const guildId = req.params.id;
    
    // In a production environment, save these to the database
    
    // Redirect back to moderation page
    res.redirect(`/servers/${guildId}/moderation`);
  } catch (err) {
    console.error('Error saving moderation settings:', err);
    res.status(500).render('pages/error', {
      title: 'Error',
      error: {
        status: 500,
        message: 'Failed to save moderation settings. Please try again later.'
      }
    });
  }
});

/**
 * Save mod log channel route
 */
router.post('/:id/moderation/modlog', hasGuildPermission, async (req, res) => {
  try {
    const guildId = req.params.id;
    const { modLogChannel } = req.body;
    
    // In a production environment, save these to the database
    
    // Redirect back to moderation page
    res.redirect(`/servers/${guildId}/moderation`);
  } catch (err) {
    console.error('Error saving mod log channel:', err);
    res.status(500).render('pages/error', {
      title: 'Error',
      error: {
        status: 500,
        message: 'Failed to save mod log channel. Please try again later.'
      }
    });
  }
});

/**
 * Alt detector configuration route
 */
router.get('/:id/alt-detector', hasGuildPermission, async (req, res) => {
  try {
    const guildId = req.params.id;
    const guild = req.user.guilds.find(g => g.id === guildId);
    
    // Check if the bot is in the guild
    const discordGuild = client.guilds.cache.get(guildId);
    if (!discordGuild) {
      return res.status(404).render('pages/error', {
        title: 'Error',
        error: {
          status: 404,
          message: 'Bot is not in this server. Please add the bot to the server first.'
        }
      });
    }
    
    // Get alt detector settings from database
    let altSettings = await AltDetector.findOne({ guildId });
    
    if (!altSettings) {
      // Create default settings if none exist
      altSettings = new AltDetector({
        guildId,
        enabled: false,
        minAge: 7,
        action: 'log',
        modLogChannel: null,
        notifyRole: null,
        message: 'Your account is too new to join this server.',
        bypassRoles: []
      });
      
      await altSettings.save();
    }
    
    // Get detected alt accounts (would need to implement this model and functionality)
    const altLogs = []; // Future feature: fetchAltLogs(guildId)
    
    // Get text channels for the dropdown
    const textChannels = discordGuild.channels.cache
      .filter(c => c.type === 0) // Text channels only
      .map(c => ({
        id: c.id,
        name: c.name
      }));
    
    // Get roles for the dropdown
    const roles = discordGuild.roles.cache
      .filter(r => r.name !== '@everyone')
      .sort((a, b) => b.position - a.position)
      .map(r => ({
        id: r.id,
        name: r.name,
        color: r.hexColor
      }));
    
    res.render('pages/alt-detector', {
      title: `${guild.name} - Alt Detector`,
      guild,
      altSettings,
      altLogs,
      channels: textChannels,
      roles
    });
  } catch (err) {
    console.error('Error fetching alt detector settings:', err);
    res.status(500).render('pages/error', {
      title: 'Error',
      error: {
        status: 500,
        message: 'Failed to load alt detector settings. Please try again later.'
      }
    });
  }
});

/**
 * Save alt detector configuration route
 */
router.post('/:id/alt-detector', hasGuildPermission, async (req, res) => {
  try {
    const guildId = req.params.id;
    const { 
      enabled, 
      minAge, 
      action, 
      modLogChannel, 
      notifyRole, 
      message, 
      bypassRoles 
    } = req.body;
    
    // Input validation for required fields
    if (enabled === 'on') {
      if (!minAge || minAge < 1) {
        return res.status(400).render('pages/error', {
          title: 'Error',
          error: {
            status: 400,
            message: 'Minimum account age must be at least 1 day.'
          }
        });
      }
      
      if (!action) {
        return res.status(400).render('pages/error', {
          title: 'Error',
          error: {
            status: 400,
            message: 'An action must be selected for detected alt accounts.'
          }
        });
      }
    }
    
    // Get alt detector settings from database or create new ones
    let altSettings = await AltDetector.findOne({ guildId });
    
    if (!altSettings) {
      altSettings = new AltDetector({
        guildId
      });
    }
    
    // Update alt detector settings
    altSettings.enabled = enabled === 'on';
    altSettings.minAge = parseInt(minAge) || 7;
    altSettings.action = action || 'log';
    altSettings.modLogChannel = modLogChannel || null;
    altSettings.notifyRole = notifyRole || null;
    altSettings.message = message || 'Your account is too new to join this server.';
    
    // Handle bypass roles (may be a single value or an array)
    if (bypassRoles) {
      if (Array.isArray(bypassRoles)) {
        altSettings.bypassRoles = bypassRoles;
      } else {
        altSettings.bypassRoles = [bypassRoles];
      }
    } else {
      altSettings.bypassRoles = [];
    }
    
    await altSettings.save();
    
    // Redirect back to alt detector page
    res.redirect(`/servers/${guildId}/alt-detector`);
  } catch (err) {
    console.error('Error saving alt detector settings:', err);
    res.status(500).render('pages/error', {
      title: 'Error',
      error: {
        status: 500,
        message: 'Failed to save alt detector settings. Please try again later.'
      }
    });
  }
});

/**
 * Custom commands configuration route
 */
router.get('/:id/custom-commands', hasGuildPermission, async (req, res) => {
  try {
    const guildId = req.params.id;
    const guild = req.user.guilds.find(g => g.id === guildId);
    
    // Check if the bot is in the guild
    const discordGuild = client.guilds.cache.get(guildId);
    if (!discordGuild) {
      return res.status(404).render('pages/error', {
        title: 'Error',
        error: {
          status: 404,
          message: 'Bot is not in this server. Please add the bot to the server first.'
        }
      });
    }
    
    // Get guild settings from database
    let guildData = await Guild.findOne({ guildId });
    
    if (!guildData) {
      guildData = new Guild({
        guildId,
        prefix: client.config.prefix
      });
      await guildData.save();
    }
    
    // Get custom commands from database
    const customCommands = await CustomCommand.find({ guildId });
    
    res.render('pages/custom-commands', {
      title: `${guild.name} - Custom Commands`,
      guild,
      settings: guildData,
      customCommands
    });
  } catch (err) {
    console.error('Error fetching custom commands:', err);
    res.status(500).render('pages/error', {
      title: 'Error',
      error: {
        status: 500,
        message: 'Failed to load custom commands. Please try again later.'
      }
    });
  }
});

/**
 * Create custom command route
 */
router.post('/:id/custom-commands', hasGuildPermission, async (req, res) => {
  try {
    const guildId = req.params.id;
    const { commandName, commandResponse } = req.body;
    
    // Input validation
    if (!commandName || !commandResponse) {
      return res.status(400).render('pages/error', {
        title: 'Error',
        error: {
          status: 400,
          message: 'Command name and response are required.'
        }
      });
    }
    
    // Check if command already exists
    const existingCommand = await CustomCommand.findOne({
      guildId,
      name: commandName
    });
    
    if (existingCommand) {
      return res.status(400).render('pages/error', {
        title: 'Error',
        error: {
          status: 400,
          message: `Command "${commandName}" already exists.`
        }
      });
    }
    
    // Create custom command
    const customCommand = new CustomCommand({
      guildId,
      name: commandName,
      response: commandResponse,
      createdBy: req.user.id
    });
    
    await customCommand.save();
    
    // Redirect back to custom commands page
    res.redirect(`/servers/${guildId}/custom-commands`);
  } catch (err) {
    console.error('Error creating custom command:', err);
    res.status(500).render('pages/error', {
      title: 'Error',
      error: {
        status: 500,
        message: 'Failed to create custom command. Please try again later.'
      }
    });
  }
});

/**
 * Edit custom command route
 */
router.post('/:id/custom-commands/edit', hasGuildPermission, async (req, res) => {
  try {
    const guildId = req.params.id;
    const { commandId, commandName, commandResponse } = req.body;
    
    // Input validation
    if (!commandId || !commandName || !commandResponse) {
      return res.status(400).render('pages/error', {
        title: 'Error',
        error: {
          status: 400,
          message: 'Command ID, name, and response are required.'
        }
      });
    }
    
    // Find the command to update
    const customCommand = await CustomCommand.findById(commandId);
    
    if (!customCommand || customCommand.guildId !== guildId) {
      return res.status(404).render('pages/error', {
        title: 'Error',
        error: {
          status: 404,
          message: 'Custom command not found.'
        }
      });
    }
    
    // Check if new name conflicts with another command
    if (commandName !== customCommand.name) {
      const existingCommand = await CustomCommand.findOne({
        guildId,
        name: commandName,
        _id: { $ne: commandId } // Exclude the current command
      });
      
      if (existingCommand) {
        return res.status(400).render('pages/error', {
          title: 'Error',
          error: {
            status: 400,
            message: `Command "${commandName}" already exists.`
          }
        });
      }
    }
    
    // Update custom command
    customCommand.name = commandName;
    customCommand.response = commandResponse;
    customCommand.updatedBy = req.user.id;
    customCommand.updatedAt = Date.now();
    
    await customCommand.save();
    
    // Redirect back to custom commands page
    res.redirect(`/servers/${guildId}/custom-commands`);
  } catch (err) {
    console.error('Error editing custom command:', err);
    res.status(500).render('pages/error', {
      title: 'Error',
      error: {
        status: 500,
        message: 'Failed to edit custom command. Please try again later.'
      }
    });
  }
});

/**
 * Delete custom command route
 */
router.post('/:id/custom-commands/:commandId/delete', hasGuildPermission, async (req, res) => {
  try {
    const guildId = req.params.id;
    const commandId = req.params.commandId;
    
    // Find and delete the custom command
    const result = await CustomCommand.deleteOne({
      _id: commandId,
      guildId
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).render('pages/error', {
        title: 'Error',
        error: {
          status: 404,
          message: 'Custom command not found.'
        }
      });
    }
    
    // Redirect back to custom commands page
    res.redirect(`/servers/${guildId}/custom-commands`);
  } catch (err) {
    console.error('Error deleting custom command:', err);
    res.status(500).render('pages/error', {
      title: 'Error',
      error: {
        status: 500,
        message: 'Failed to delete custom command. Please try again later.'
      }
    });
  }
});

/**
 * Ticket system configuration route
 */
router.get('/:id/tickets', hasGuildPermission, async (req, res) => {
  try {
    const guildId = req.params.id;
    const guild = req.user.guilds.find(g => g.id === guildId);
    
    // Placeholder for ticket settings
    // In a production environment, fetch these from the database
    const ticketSettings = {
      enabled: false,
      ticketCategory: null,
      ticketLogChannel: null,
      supportRoles: [],
      welcomeMessage: 'Thank you for creating a ticket. Please describe your issue and a staff member will assist you shortly.',
      ticketLimit: 1,
      nameFormat: 'ticket-{username}-{number}',
      types: [
        { name: 'General Support', emoji: '🔧', description: 'Get help with general issues' },
        { name: 'Report User', emoji: '🚨', description: 'Report a user who is breaking rules' }
      ]
    };
    
    // Placeholder for ticket stats
    // In a production environment, fetch these from the database
    const ticketStats = {
      total: 0,
      open: 0,
      closedToday: 0,
      avgResponse: '0m'
    };
    
    // Placeholder for recent tickets
    // In a production environment, fetch these from the database
    const recentTickets = [];
    
    res.render('pages/tickets', {
      title: `${guild.name} - Ticket System`,
      guild,
      ticketSettings,
      ticketStats,
      recentTickets
    });
  } catch (err) {
    console.error('Error fetching ticket settings:', err);
    res.status(500).render('pages/error', {
      title: 'Error',
      error: {
        status: 500,
        message: 'Failed to load ticket settings. Please try again later.'
      }
    });
  }
});

/**
 * Save ticket system configuration route
 */
router.post('/:id/tickets', hasGuildPermission, async (req, res) => {
  try {
    const guildId = req.params.id;
    
    // In a production environment, save these to the database
    
    // Redirect back to tickets page
    res.redirect(`/servers/${guildId}/tickets`);
  } catch (err) {
    console.error('Error saving ticket settings:', err);
    res.status(500).render('pages/error', {
      title: 'Error',
      error: {
        status: 500,
        message: 'Failed to save ticket settings. Please try again later.'
      }
    });
  }
});

/**
 * Reaction roles configuration route
 */
router.get('/:id/reaction-roles', hasGuildPermission, async (req, res) => {
  try {
    const guildId = req.params.id;
    const guild = req.user.guilds.find(g => g.id === guildId);
    
    // Placeholder for reaction roles
    // In a production environment, fetch these from the database
    const reactionRoles = [];
    
    res.render('pages/reaction-roles', {
      title: `${guild.name} - Reaction Roles`,
      guild,
      reactionRoles
    });
  } catch (err) {
    console.error('Error fetching reaction roles:', err);
    res.status(500).render('pages/error', {
      title: 'Error',
      error: {
        status: 500,
        message: 'Failed to load reaction roles. Please try again later.'
      }
    });
  }
});

/**
 * Create reaction roles route
 */
router.post('/:id/reaction-roles', hasGuildPermission, async (req, res) => {
  try {
    const guildId = req.params.id;
    
    // In a production environment, save these to the database
    
    // Redirect back to reaction roles page
    res.redirect(`/servers/${guildId}/reaction-roles`);
  } catch (err) {
    console.error('Error creating reaction roles:', err);
    res.status(500).render('pages/error', {
      title: 'Error',
      error: {
        status: 500,
        message: 'Failed to create reaction roles. Please try again later.'
      }
    });
  }
});

/**
 * Delete reaction roles route
 */
router.post('/:id/reaction-roles/:menuId/delete', hasGuildPermission, async (req, res) => {
  try {
    const guildId = req.params.id;
    const menuId = req.params.menuId;
    
    // In a production environment, delete this from the database
    
    // Redirect back to reaction roles page
    res.redirect(`/servers/${guildId}/reaction-roles`);
  } catch (err) {
    console.error('Error deleting reaction roles:', err);
    res.status(500).render('pages/error', {
      title: 'Error',
      error: {
        status: 500,
        message: 'Failed to delete reaction roles. Please try again later.'
      }
    });
  }
});

/**
 * Server logs configuration route
 */
router.get('/:id/logs', hasGuildPermission, async (req, res) => {
  try {
    const guildId = req.params.id;
    const guild = req.user.guilds.find(g => g.id === guildId);
    
    // Placeholder for log settings
    // In a production environment, fetch these from the database
    const logSettings = {
      enabled: false,
      logChannel: null,
      modLogChannel: null,
      useSeparateModLogs: false,
      ignoredChannels: [],
      ignoredRoles: [],
      categories: {
        members: {
          join: true,
          leave: true,
          nickname: true,
          roles: true
        },
        messages: {
          delete: true,
          edit: true,
          bulkDelete: true,
          reactions: false
        },
        channels: {
          create: true,
          delete: true,
          update: true,
          voice: true
        },
        server: {
          roleCreate: true,
          roleDelete: true,
          roleUpdate: true,
          update: true
        },
        moderation: {
          ban: true,
          kick: true,
          mute: true,
          warn: true
        }
      }
    };
    
    // Placeholder for recent logs
    // In a production environment, fetch these from the database
    const recentLogs = [];
    
    res.render('pages/logs', {
      title: `${guild.name} - Server Logs`,
      guild,
      logSettings,
      recentLogs
    });
  } catch (err) {
    console.error('Error fetching log settings:', err);
    res.status(500).render('pages/error', {
      title: 'Error',
      error: {
        status: 500,
        message: 'Failed to load log settings. Please try again later.'
      }
    });
  }
});

/**
 * Save server logs configuration route
 */
router.post('/:id/logs', hasGuildPermission, async (req, res) => {
  try {
    const guildId = req.params.id;
    
    // In a production environment, save these to the database
    
    // Redirect back to logs page
    res.redirect(`/servers/${guildId}/logs`);
  } catch (err) {
    console.error('Error saving log settings:', err);
    res.status(500).render('pages/error', {
      title: 'Error',
      error: {
        status: 500,
        message: 'Failed to save log settings. Please try again later.'
      }
    });
  }
});

module.exports = router;