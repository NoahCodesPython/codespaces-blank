const express = require('express');
const router = express.Router();
const { isAuthenticated, hasGuildPermission } = require('../middleware/auth');

// Import Discord client
// const client = require('../../index').client;

/**
 * Get guild channels
 * @route GET /api/guilds/:id/channels
 */
router.get('/guilds/:id/channels', hasGuildPermission, async (req, res) => {
  try {
    const guildId = req.params.id;
    const typeFilter = req.query.type || 'all';
    
    // Placeholder for guild channels
    // In a production environment, fetch these from the Discord API
    const channels = [
      // Example text channels
      { id: '123456789', name: 'general', type: 'GUILD_TEXT' },
      { id: '123456790', name: 'welcome', type: 'GUILD_TEXT' },
      { id: '123456791', name: 'rules', type: 'GUILD_TEXT' },
      
      // Example voice channels
      { id: '123456792', name: 'General Voice', type: 'GUILD_VOICE' },
      { id: '123456793', name: 'Gaming', type: 'GUILD_VOICE' },
      
      // Example categories
      { id: '123456794', name: 'TEXT CHANNELS', type: 'GUILD_CATEGORY' },
      { id: '123456795', name: 'VOICE CHANNELS', type: 'GUILD_CATEGORY' }
    ];
    
    // Filter channels by type if specified
    let filteredChannels = channels;
    if (typeFilter !== 'all') {
      const typeMap = {
        'text': 'GUILD_TEXT',
        'voice': 'GUILD_VOICE',
        'category': 'GUILD_CATEGORY'
      };
      
      const discordType = typeMap[typeFilter];
      if (discordType) {
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
    
    // Placeholder for guild roles
    // In a production environment, fetch these from the Discord API
    const roles = [
      { id: '123456796', name: '@everyone', color: '#000000', position: 0 },
      { id: '123456797', name: 'Admin', color: '#ff0000', position: 5 },
      { id: '123456798', name: 'Moderator', color: '#00ff00', position: 4 },
      { id: '123456799', name: 'Member', color: '#0000ff', position: 3 },
      { id: '123456800', name: 'Bot', color: '#ff00ff', position: 2 },
      { id: '123456801', name: 'New Member', color: '#ffff00', position: 1 }
    ];
    
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
    
    // Placeholder for reaction role menu
    // In a production environment, fetch this from the database
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
    const after = req.query.after || '0';
    
    // Placeholder for guild members
    // In a production environment, fetch these from the Discord API
    const members = [
      { id: '111111111', username: 'User1', discriminator: '0001', avatar: null, joinedAt: new Date().toISOString() },
      { id: '222222222', username: 'User2', discriminator: '0002', avatar: null, joinedAt: new Date().toISOString() },
      { id: '333333333', username: 'User3', discriminator: '0003', avatar: null, joinedAt: new Date().toISOString() },
      { id: '444444444', username: 'User4', discriminator: '0004', avatar: null, joinedAt: new Date().toISOString() },
      { id: '555555555', username: 'User5', discriminator: '0005', avatar: null, joinedAt: new Date().toISOString() }
    ];
    
    res.json({
      success: true,
      members,
      next: null // Pagination token for next page if applicable
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
 * Get user data
 * @route GET /api/users/:id
 */
router.get('/users/:id', isAuthenticated, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Only allow users to get their own data unless they are an admin
    if (userId !== req.user.id && !process.env.ADMIN_IDS.split(',').includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }
    
    // Placeholder for user data
    // In a production environment, fetch this from the database
    const userData = {
      id: userId,
      username: req.user.username,
      discriminator: req.user.discriminator,
      avatar: req.user.avatar,
      economy: {
        wallet: 0,
        bank: 0
      },
      preferences: {
        dmNotifications: true,
        reminderDm: true,
        showOnLeaderboard: true
      }
    };
    
    res.json({
      success: true,
      user: userData
    });
  } catch (err) {
    console.error('Error fetching user data:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user data'
    });
  }
});

module.exports = router;