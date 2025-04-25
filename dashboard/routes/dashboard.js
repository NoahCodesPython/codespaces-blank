const express = require('express');
const router = express.Router();
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// Import database models
// const User = require('../../src/models/User');
// const Reminder = require('../../src/models/Reminder');

/**
 * Dashboard home route
 * Shows user's manageable servers
 */
router.get('/', isAuthenticated, async (req, res) => {
  try {
    // Get the guilds the user has MANAGE_GUILD permission for
    const managableGuilds = req.user.guilds.filter(
      guild => (guild.permissions & 0x20) === 0x20 || (guild.permissions & 0x8) === 0x8
    );
    
    res.render('pages/dashboard', {
      title: 'Dashboard',
      guilds: managableGuilds
    });
  } catch (err) {
    console.error('Error fetching dashboard data:', err);
    res.status(500).render('pages/error', {
      title: 'Error',
      error: {
        status: 500,
        message: 'Failed to load dashboard data. Please try again later.'
      }
    });
  }
});

/**
 * User profile route
 * Shows user information and settings
 */
router.get('/profile', isAuthenticated, async (req, res) => {
  try {
    // Placeholder for user profile data
    // In a production environment, fetch this from the database
    const userData = {
      id: req.user.id,
      username: req.user.username,
      discriminator: req.user.discriminator,
      avatar: req.user.avatar
    };
    
    // Placeholder for user economy data
    // In a production environment, fetch this from the database
    const userEconomy = {
      wallet: 0,
      bank: 0,
      transactions: []
    };
    
    // Placeholder for user reminders
    // In a production environment, fetch these from the database
    const userReminders = [];
    
    // Placeholder for user preferences
    // In a production environment, fetch these from the database
    const userPreferences = {
      dmNotifications: true,
      reminderDm: true,
      showOnLeaderboard: true
    };
    
    res.render('pages/profile', {
      title: 'Your Profile',
      userData,
      userEconomy,
      userReminders,
      userPreferences
    });
  } catch (err) {
    console.error('Error fetching profile data:', err);
    res.status(500).render('pages/error', {
      title: 'Error',
      error: {
        status: 500,
        message: 'Failed to load profile data. Please try again later.'
      }
    });
  }
});

/**
 * Save user preferences route
 */
router.post('/profile/preferences', isAuthenticated, async (req, res) => {
  try {
    const { dmNotifications, reminderDm, showOnLeaderboard } = req.body;
    
    // In a production environment, save these to the database
    
    // Flash a success message
    req.flash('success', 'Your preferences have been saved.');
    
    // Redirect back to profile
    res.redirect('/dashboard/profile');
  } catch (err) {
    console.error('Error saving preferences:', err);
    res.status(500).render('pages/error', {
      title: 'Error',
      error: {
        status: 500,
        message: 'Failed to save preferences. Please try again later.'
      }
    });
  }
});

/**
 * Admin dashboard route
 * For bot administrators only
 */
router.get('/admin', isAdmin, async (req, res) => {
  try {
    // Placeholder for admin dashboard data
    // In a production environment, fetch these from the database
    const stats = {
      servers: 0,
      users: 0,
      commands: 0,
      uptime: 0
    };
    
    res.render('pages/admin', {
      title: 'Admin Dashboard',
      stats
    });
  } catch (err) {
    console.error('Error fetching admin data:', err);
    res.status(500).render('pages/error', {
      title: 'Error',
      error: {
        status: 500,
        message: 'Failed to load admin dashboard. Please try again later.'
      }
    });
  }
});

module.exports = router;