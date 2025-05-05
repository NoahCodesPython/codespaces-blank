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

// Import Axios for API requests
const axios = require('axios');
const BOT_API_BASE_URL = process.env.BOT_API_BASE_URL || 'http://localhost:4000/api';

/**
 * Get guild channels
 * @route GET /api/guilds/:id/channels
 */
router.get('/guilds/:id/channels', hasGuildPermission, async (req, res) => {
  try {
    const guildId = req.params.id;
    const typeFilter = req.query.type || 'all';

    // Fetch channels from bot API
    const response = await axios.get(`${BOT_API_BASE_URL}/guilds/${guildId}/channels`, {
      params: { type: typeFilter },
    });

    res.json(response.data);
  } catch (err) {
    console.error('Error fetching guild channels from bot API:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch channels' });
  }
});

/**
 * Get guild roles
 * @route GET /api/guilds/:id/roles
 */
router.get('/guilds/:id/roles', hasGuildPermission, async (req, res) => {
  try {
    const guildId = req.params.id;

    // Fetch roles from bot API
    const response = await axios.get(`${BOT_API_BASE_URL}/guilds/${guildId}/roles`);

    res.json(response.data);
  } catch (err) {
    console.error('Error fetching guild roles from bot API:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch roles' });
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
router.get('/guilds/:id/settings', async (req, res) => {
  try {
    const guildId = req.params.id;
    const response = await axios.get(`${BOT_API_BASE_URL}/guilds/${guildId}/settings`);
    res.json(response.data);
  } catch (err) {
    console.error('Error fetching guild settings from bot API:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch guild settings' });
  }
});

/**
 * Save server settings
 * @route POST /api/guilds/:id/settings
 */
router.post('/guilds/:id/settings', async (req, res) => {
  try {
    const guildId = req.params.id;
    const { prefix, welcome, antiInvite, antiLink } = req.body;

    // Find or create guild settings in the database
    let guildSettings = await Guild.findOne({ guildId });

    if (!guildSettings) {
      guildSettings = new Guild({ guildId });
    }

    // Update settings
    guildSettings.prefix = prefix;
    guildSettings.welcome = welcome;
    guildSettings.antiInvite = antiInvite;
    guildSettings.antiLink = antiLink;

    await guildSettings.save();

    res.status(200).json({ message: 'Settings saved successfully.' });
  } catch (err) {
    console.error('Error saving server settings:', err);
    res.status(500).json({ error: 'Failed to save server settings.' });
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

/**
 * Get advanced welcome types
 * @route GET /api/guilds/:id/welcome-types
 */
router.get('/guilds/:id/welcome-types', hasGuildPermission, async (req, res) => {
  try {
    const guildId = req.params.id;

    // Placeholder for advanced welcome types
    const welcomeTypes = [
      { type: 'GIF', description: 'Animated welcome messages' },
      { type: 'Embed', description: 'Rich embed welcome messages' },
      { type: 'Text', description: 'Simple text welcome messages' }
    ];

    res.json({
      success: true,
      welcomeTypes
    });
  } catch (err) {
    console.error('Error fetching welcome types:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch welcome types'
    });
  }
});

/**
 * Get commands from bot API
 * @route GET /api/commands
 */
router.get('/commands', async (req, res) => {
  try {
    const response = await axios.get(`${BOT_API_BASE_URL}/commands`);
    res.json(response.data);
  } catch (err) {
    console.error('Error fetching commands from bot API:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch commands' });
  }
});

module.exports = router;