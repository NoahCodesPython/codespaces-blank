const express = require('express');
const router = express.Router();
const { isAuthenticated, hasGuildPermission } = require('../middleware/auth');

// Import Discord client
const { client } = require('../../index');

// Import database models
const User = require('../../src/models/User');
const Guild = require('../../src/models/Guild');
const TempVC = require('../../src/models/TempVC');
const SuggestionSettings = require('../../src/models/SuggestionSettings');
const AutoResponse = require('../../src/models/AutoResponse');
const CustomCommand = require('../../src/models/CustomCommand');
const AltDetector = require('../../src/models/AltDetector');
const Reminder = require('../../src/models/Reminder');

/**
 * Get guild channels
 * @route GET /api/guilds/:id/channels
 */
router.get('/guilds/:id/channels', hasGuildPermission, async (req, res) => {
  try {
    const guildId = req.params.id;
    const typeFilter = req.query.type || 'all';
    
    // Check if the bot is in the guild
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      return res.status(404).json({
        success: false,
        error: 'Guild not found'
      });
    }
    
    // Get all channels in the guild
    const channels = guild.channels.cache.map(channel => {
      return {
        id: channel.id,
        name: channel.name,
        type: channel.type
      };
    });
    
    // Filter channels by type if specified
    let filteredChannels = channels;
    if (typeFilter !== 'all') {
      const typeMap = {
        'text': 0,      // GUILD_TEXT
        'voice': 2,     // GUILD_VOICE
        'category': 4   // GUILD_CATEGORY
      };
      
      const discordType = typeMap[typeFilter];
      if (discordType !== undefined) {
        filteredChannels = channels.filter(channel => channel.type === discordType);
      }
    }
    
    res.json({
      success: true,
      channels: filteredChannels
    });
  } catch (err) {
    console.error('Error fetching guild channels:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch channels'
    });
  }
});

/**
 * Get guild roles
 * @route GET /api/guilds/:id/roles
 */
router.get('/guilds/:id/roles', hasGuildPermission, async (req, res) => {
  try {
    const guildId = req.params.id;
    
    // Check if the bot is in the guild
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      return res.status(404).json({
        success: false,
        error: 'Guild not found'
      });
    }
    
    // Get all roles in the guild
    const roles = guild.roles.cache.map(role => {
      return {
        id: role.id,
        name: role.name,
        color: role.hexColor,
        position: role.position
      };
    });
    
    // Sort roles by position (highest first)
    const sortedRoles = [...roles].sort((a, b) => b.position - a.position);
    
    res.json({
      success: true,
      roles: sortedRoles
    });
  } catch (err) {
    console.error('Error fetching guild roles:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch roles'
    });
  }
});

/**
 * Get reaction role menu
 * @route GET /api/guilds/:id/reaction-roles/:menuId
 */
router.get('/guilds/:id/reaction-roles/:menuId', hasGuildPermission, async (req, res) => {
  try {
    const guildId = req.params.id;
    const menuId = req.params.menuId;
    
    // Get the reaction role menu from the database
    // You'll need to implement this with your reaction role database model
    
    // For now, return a placeholder
    const menu = {
      _id: menuId,
      title: 'Choose Your Roles',
      description: 'React to get roles!',
      channelId: '123456789',
      channelName: 'roles',
      messageId: '987654321',
      type: 'toggle',
      roles: [
        { emoji: '🔴', roleId: '123456797', roleName: 'Admin', roleColor: '#ff0000' },
        { emoji: '🟢', roleId: '123456798', roleName: 'Moderator', roleColor: '#00ff00' },
        { emoji: '🔵', roleId: '123456799', roleName: 'Member', roleColor: '#0000ff' }
      ]
    };
    
    res.json({
      success: true,
      menu
    });
  } catch (err) {
    console.error('Error fetching reaction role menu:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reaction role menu'
    });
  }
});

/**
 * Get guild members
 * @route GET /api/guilds/:id/members
 */
router.get('/guilds/:id/members', hasGuildPermission, async (req, res) => {
  try {
    const guildId = req.params.id;
    const limit = parseInt(req.query.limit) || 100;
    
    // Check if the bot is in the guild
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      return res.status(404).json({
        success: false,
        error: 'Guild not found'
      });
    }
    
    // Get members from the guild
    const members = await guild.members.fetch({ limit });
    
    const formattedMembers = members.map(member => {
      return {
        id: member.id,
        username: member.user.username,
        discriminator: member.user.discriminator,
        avatar: member.user.avatar,
        joinedAt: member.joinedAt
      };
    });
    
    res.json({
      success: true,
      members: formattedMembers,
      next: null // Pagination not implemented yet
    });
  } catch (err) {
    console.error('Error fetching guild members:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch members'
    });
  }
});

/**
 * Get guild settings
 * @route GET /api/guilds/:id/settings
 */
router.get('/guilds/:id/settings', hasGuildPermission, async (req, res) => {
  try {
    const guildId = req.params.id;
    
    // Get guild settings from database
    let guildSettings = await Guild.findOne({ guildId });
    
    if (!guildSettings) {
      // Create default settings if none exist
      guildSettings = new Guild({
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
      
      await guildSettings.save();
    }
    
    res.json({
      success: true,
      settings: guildSettings
    });
  } catch (err) {
    console.error('Error fetching guild settings:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch guild settings'
    });
  }
});

/**
 * Get auto responses
 * @route GET /api/guilds/:id/auto-responses
 */
router.get('/guilds/:id/auto-responses', hasGuildPermission, async (req, res) => {
  try {
    const guildId = req.params.id;
    
    // Get auto responses from database
    const autoResponses = await AutoResponse.find({ guildId });
    
    res.json({
      success: true,
      autoResponses
    });
  } catch (err) {
    console.error('Error fetching auto responses:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch auto responses'
    });
  }
});

/**
 * Get custom commands
 * @route GET /api/guilds/:id/custom-commands
 */
router.get('/guilds/:id/custom-commands', hasGuildPermission, async (req, res) => {
  try {
    const guildId = req.params.id;
    
    // Get custom commands from database
    const customCommands = await CustomCommand.find({ guildId });
    
    res.json({
      success: true,
      customCommands
    });
  } catch (err) {
    console.error('Error fetching custom commands:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch custom commands'
    });
  }
});

/**
 * Get temp VC settings
 * @route GET /api/guilds/:id/temp-vc
 */
router.get('/guilds/:id/temp-vc', hasGuildPermission, async (req, res) => {
  try {
    const guildId = req.params.id;
    
    // Get temp VC settings from database
    let tempVCSettings = await TempVC.findOne({ guildId });
    
    if (!tempVCSettings) {
      // Create default settings if none exist
      tempVCSettings = {
        enabled: false,
        channelId: null,
        categoryId: null,
        nameFormat: '{username}\'s channel'
      };
    }
    
    res.json({
      success: true,
      tempVCSettings
    });
  } catch (err) {
    console.error('Error fetching temp VC settings:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch temp VC settings'
    });
  }
});

/**
 * Get suggestion settings
 * @route GET /api/guilds/:id/suggestions
 */
router.get('/guilds/:id/suggestions', hasGuildPermission, async (req, res) => {
  try {
    const guildId = req.params.id;
    
    // Get suggestion settings from database
    let suggestionSettings = await SuggestionSettings.findOne({ guildId });
    
    if (!suggestionSettings) {
      // Create default settings if none exist
      suggestionSettings = {
        enabled: false,
        suggestionChannel: null
      };
    }
    
    res.json({
      success: true,
      suggestionSettings
    });
  } catch (err) {
    console.error('Error fetching suggestion settings:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch suggestion settings'
    });
  }
});

/**
 * Get alt detector settings
 * @route GET /api/guilds/:id/alt-detector
 */
router.get('/guilds/:id/alt-detector', hasGuildPermission, async (req, res) => {
  try {
    const guildId = req.params.id;
    
    // Get alt detector settings from database
    let altSettings = await AltDetector.findOne({ guildId });
    
    if (!altSettings) {
      // Create default settings if none exist
      altSettings = {
        enabled: false,
        minAge: 7,
        action: 'log',
        modLogChannel: null,
        bypassRoles: []
      };
    }
    
    res.json({
      success: true,
      altSettings
    });
  } catch (err) {
    console.error('Error fetching alt detector settings:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alt detector settings'
    });
  }
});

/**
 * Get user data
 * @route GET /api/users/:id
 */
router.get('/users/:id', isAuthenticated, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Only allow users to get their own data unless they are an admin
    const isAdmin = client.config.adminIDs.includes(req.user.id);
    if (userId !== req.user.id && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }
    
    // Get user data from database
    let userData = await User.findOne({ userId });
    
    if (!userData) {
      // Create default user data if none exists
      userData = new User({
        userId,
        economy: {
          wallet: 0,
          bank: 0
        },
        preferences: {
          dmNotifications: true,
          reminderDm: true,
          showOnLeaderboard: true
        }
      });
      
      await userData.save();
    }
    
    // Get user reminders
    const reminders = await Reminder.find({ userId });
    
    res.json({
      success: true,
      user: {
        ...userData.toObject(),
        reminders
      }
    });
  } catch (err) {
    console.error('Error fetching user data:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user data'
    });
  }
});

/**
 * Get bot statistics
 * @route GET /api/stats
 */
router.get('/stats', isAuthenticated, async (req, res) => {
  try {
    const serverCount = client.guilds.cache.size;
    const userCount = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
    const channelCount = client.channels.cache.size;
    const commandCount = client.slashCommands.size;
    const uptime = process.uptime();
    
    res.json({
      success: true,
      stats: {
        servers: serverCount,
        users: userCount,
        channels: channelCount,
        commands: commandCount,
        uptime
      }
    });
  } catch (err) {
    console.error('Error fetching bot statistics:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bot statistics'
    });
  }
});

module.exports = router;