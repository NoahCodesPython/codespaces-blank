const express = require('express');
const passport = require('passport');
const router = express.Router();
const { isAuthenticated, isNotAuthenticated } = require('../middleware/auth');

/**
 * Login page route
 * If already authenticated, redirects to dashboard
 */
router.get('/login', isNotAuthenticated, (req, res) => {
  res.render('pages/login', { title: 'Login' });
});

/**
 * Discord authentication route
 * Redirects to Discord OAuth2 authorization page
 */
router.get('/discord', passport.authenticate('discord'));

/**
 * Discord callback route
 * Handles the response from Discord OAuth2
 */
router.get(
  '/discord/callback',
  passport.authenticate('discord', {
    failureRedirect: '/auth/login',
  }),
  (req, res) => {
    // Successful authentication
    res.redirect('/dashboard');
  }
);

/**
 * Logout route
 * Logs the user out and redirects to home page
 */
router.get('/logout', isAuthenticated, (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Error during logout:', err);
      return res.status(500).render('pages/error', {
        title: 'Error',
        error: {
          status: 500,
          message: 'An error occurred during logout. Please try again.',
        },
      });
    }
    res.redirect('/');
  });
});

module.exports = router;