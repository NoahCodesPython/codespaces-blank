/**
 * Authentication middleware for Aquire Bot Dashboard
 */

/**
 * Check if user is authenticated
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/auth/login');
}

/**
 * Check if user is not authenticated
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function isNotAuthenticated(req, res, next) {
  if (!req.isAuthenticated()) {
    return next();
  }
  res.redirect('/dashboard');
}

/**
 * Check if user is an admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function isAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user && process.env.ADMIN_IDS && process.env.ADMIN_IDS.split(',').includes(req.user.id)) {
    return next();
  }
  
  res.status(403).render('pages/error', {
    title: 'Access Denied',
    error: {
      status: 403,
      message: 'You do not have permission to access this page.'
    }
  });
}

/**
 * Check if user has permission to manage the guild
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function hasGuildPermission(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.redirect('/auth/login');
  }
  
  const guildID = req.params.id;
  if (!guildID) {
    return res.status(400).render('pages/error', {
      title: 'Error',
      error: {
        status: 400,
        message: 'Invalid server ID.'
      }
    });
  }
  
  // Check if user has access to the guild
  const userGuilds = req.user.guilds || [];
  const guild = userGuilds.find(g => g.id === guildID);
  
  if (!guild) {
    return res.status(403).render('pages/error', {
      title: 'Access Denied',
      error: {
        status: 403,
        message: 'You do not have access to this server.'
      }
    });
  }
  
  // Check if user has manage guild permission
  // 0x20 is the MANAGE_GUILD permission bit
  // 0x8 is the ADMINISTRATOR permission bit
  const hasManageGuild = (guild.permissions & 0x20) === 0x20 || (guild.permissions & 0x8) === 0x8;
  
  if (!hasManageGuild) {
    return res.status(403).render('pages/error', {
      title: 'Access Denied',
      error: {
        status: 403,
        message: 'You do not have the required permissions to manage this server.'
      }
    });
  }
  
  // Check if bot is in the guild
  // This will be implemented in the route handlers where we fetch the guild data
  
  next();
}

module.exports = {
  isAuthenticated,
  isNotAuthenticated,
  isAdmin,
  hasGuildPermission
};