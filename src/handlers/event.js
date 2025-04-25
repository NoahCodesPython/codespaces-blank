const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

/**
 * Load all event files
 * @param {Client} client - Discord.js client 
 */
const loadEvents = async (client) => {
  try {
    // Get all event folders (client, guild, etc.)
    const eventFolders = await fs.readdir(path.join(__dirname, '..', 'events'));
    
    for (const folder of eventFolders) {
      // Get event files in each folder
      const eventFiles = await fs.readdir(path.join(__dirname, '..', 'events', folder))
        .then(files => files.filter(file => file.endsWith('.js')));
      
      logger.info(`Loading ${eventFiles.length} events from ${folder}...`);

      for (const file of eventFiles) {
        const event = require(path.join(__dirname, '..', 'events', folder, file));
        const eventName = file.split('.')[0];
        
        // Register event
        if (event.once) {
          client.once(eventName, (...args) => event.execute(client, ...args));
        } else {
          client.on(eventName, (...args) => event.execute(client, ...args));
        }
      }
    }
    
    logger.info('Events loaded successfully!');
  } catch (error) {
    logger.error(`Error loading events: ${error}`);
  }
};

module.exports = { loadEvents };
