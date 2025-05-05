const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const config = require('../config');
const Guild = require('../models/Guild');

/**
 * Start the API server to handle requests from the dashboard.
 * @param {Client} client - The Discord client instance.
 */
function startApiServer(client) {
  const app = express();

  // Middleware
  app.use(cors({ origin: config.apiConfig.allowedOrigins }));
  app.use(bodyParser.json());

  // API Endpoints

  // Fetch bot commands
  app.get('/api/commands', (req, res) => {
    try {
      const commands = client.slashCommands.map(cmd => ({
        name: cmd.name,
        description: cmd.description || 'No description available', // Add fallback for missing descriptions
        options: cmd.options || [],
        category: cmd.category || 'Uncategorized' // Include category if available
      }));

      res.json({ success: true, commands });
    } catch (err) {
      console.error('Error fetching commands:', err);
      res.status(500).json({ success: false, error: 'Failed to fetch commands' });
    }
  });

  // Get guild settings
  app.get('/api/guilds/:id/settings', async (req, res) => {
    try {
      const guildId = req.params.id;
      const guildSettings = await client.database.Guild.findOne({ guildId });
      if (!guildSettings) {
        return res.status(404).json({ success: false, error: 'Guild settings not found' });
      }
      res.json({ success: true, settings: guildSettings });
    } catch (error) {
      console.error('Error fetching guild settings:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch guild settings' });
    }
  });

  // Add a POST endpoint to save guild settings
  app.post('/api/guilds/:id/settings', async (req, res) => {
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
      console.error('Error saving guild settings:', err);
      res.status(500).json({ error: 'Failed to save guild settings.' });
    }
  });

  // Fetch guild channels
  app.get('/api/guilds/:id/channels', async (req, res) => {
    try {
      const guildId = req.params.id;
      const typeFilter = req.query.type || 'all';

      const guild = client.guilds.cache.get(guildId);
      if (!guild) {
        return res.status(404).json({ success: false, error: 'Guild not found' });
      }

      const channels = guild.channels.cache.map(channel => ({
        id: channel.id,
        name: channel.name,
        type: channel.type
      }));

      let filteredChannels = channels;
      if (typeFilter !== 'all') {
        const typeMap = {
          text: 0, // GUILD_TEXT
          voice: 2, // GUILD_VOICE
          category: 4 // GUILD_CATEGORY
        };
        const discordType = typeMap[typeFilter];
        if (discordType !== undefined) {
          filteredChannels = channels.filter(channel => channel.type === discordType);
        }
      }

      res.json({ success: true, channels: filteredChannels });
    } catch (err) {
      console.error('Error fetching guild channels:', err);
      res.status(500).json({ success: false, error: 'Failed to fetch channels' });
    }
  });

  // Fetch guild roles
  app.get('/api/guilds/:id/roles', async (req, res) => {
    try {
      const guildId = req.params.id;

      const guild = client.guilds.cache.get(guildId);
      if (!guild) {
        return res.status(404).json({ success: false, error: 'Guild not found' });
      }

      const roles = guild.roles.cache.map(role => ({
        id: role.id,
        name: role.name,
        color: role.hexColor,
        position: role.position
      })).sort((a, b) => b.position - a.position);

      res.json({ success: true, roles });
    } catch (err) {
      console.error('Error fetching guild roles:', err);
      res.status(500).json({ success: false, error: 'Failed to fetch roles' });
    }
  });

  // Start the server
  const port = config.apiConfig.port;
  app.listen(port, () => {
    console.log(`API server running on port ${port}`);
  });
}

module.exports = { startApiServer };