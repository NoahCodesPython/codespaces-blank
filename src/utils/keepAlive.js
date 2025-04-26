/**
 * Keep-alive server for Replit and Glitch hosting
 * This simple express server helps prevent the bot from sleeping on platforms
 * that have idle timeouts (like Replit's free tier)
 */

const express = require('express');
const config = require('../config');

/**
 * Start the keep-alive server
 * @returns {Object} Express server instance
 */
function startKeepAliveServer() {
  if (!config.keepAlive) {
    console.log('[KEEP-ALIVE] Keep-alive server not needed for this platform.');
    return null;
  }

  const app = express();
  const port = process.env.KEEP_ALIVE_PORT || 8000;

  app.get('/', (req, res) => {
    res.status(200).send('Aquire Bot is running!');
  });

  app.get('/status', (req, res) => {
    res.status(200).json({
      status: 'online',
      platform: config.platform,
      uptime: process.uptime()
    });
  });

  const server = app.listen(port, () => {
    console.log(`[KEEP-ALIVE] Server running on port ${port}`);
  });

  process.on('SIGINT', () => {
    server.close();
  });

  return server;
}

module.exports = { startKeepAliveServer };