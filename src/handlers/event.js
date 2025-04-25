const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

/**
 * Maps of already loaded event handlers to prevent duplicates
 * Keys are event names, values are listener functions
 */
const loadedEventListeners = new Map();

/**
 * Load all event files
 * @param {Client} client - Discord.js client 
 */
const loadEvents = async (client) => {
  try {
    // Remove any previously loaded event listeners
    cleanupExistingListeners(client);
    
    // Get all event folders (client, guild, etc.)
    const eventFolders = await fs.readdir(path.join(__dirname, '..', 'events'));
    
    // Track loaded event handlers
    const loadedEvents = new Set();
    
    // Define primary handlers for each event type - only these will be loaded
    const primaryHandlers = {
      'interactionCreate': 'interactionCreate.js',
      'messageCreate': 'messageCreate.js'
    };
    
    // List of deprecated handlers that have been moved to the centralized system
    const deprecatedHandlers = [
      'ticketButtonCreate.js',
      'ticketButtonClose.js',
      'suggestionVote.js',
      'modalSubmit.js',
      // Add any other deprecated handlers here
    ];
    
    // First pass: load important primary handlers
    for (const folder of eventFolders) {
      const eventFiles = await fs.readdir(path.join(__dirname, '..', 'events', folder))
        .then(files => files.filter(file => file.endsWith('.js')));
      
      logger.info(`Loading ${eventFiles.length} events from ${folder}...`);
      
      // First load primary handlers
      for (const file of Object.values(primaryHandlers)) {
        if (eventFiles.includes(file)) {
          const eventPath = path.join(__dirname, '..', 'events', folder, file);
          const event = require(eventPath);
          const eventName = event.name || file.split('.')[0];
          
          registerEventHandler(client, eventName, event, file, folder, loadedEvents);
        }
      }
      
      // Second pass: load all other non-deprecated handlers
      for (const file of eventFiles) {
        // Skip if it's a primary handler (already loaded) or deprecated
        if (Object.values(primaryHandlers).includes(file) || deprecatedHandlers.includes(file)) {
          continue;
        }
        
        const eventPath = path.join(__dirname, '..', 'events', folder, file);
        const event = require(eventPath);
        const eventName = event.name || file.split('.')[0];
        
        // Skip duplicate handlers for events that should have one primary handler
        if (Object.keys(primaryHandlers).includes(eventName) && 
            file !== primaryHandlers[eventName] && 
            !file.startsWith('handlers/')) {
          logger.debug(`Skipping duplicate handler: ${file} for event: ${eventName}`);
          continue;
        }
        
        registerEventHandler(client, eventName, event, file, folder, loadedEvents);
      }
    }
    
    // Log all registered listeners for debugging
    logRegisteredListeners(client);
    
    logger.info('Events loaded successfully!');
  } catch (error) {
    logger.error(`Error loading events: ${error}`);
  }
};

/**
 * Register an event handler and store the listener function
 */
function registerEventHandler(client, eventName, event, file, folder, loadedEvents) {
  if (!loadedEvents.has(`${folder}:${eventName}:${file}`)) {
    // Create the listener function
    const listenerFn = (...args) => event.execute(...args, client);
    
    // Store it for potential future cleanup
    if (!loadedEventListeners.has(eventName)) {
      loadedEventListeners.set(eventName, []);
    }
    loadedEventListeners.get(eventName).push(listenerFn);
    
    // Register the event
    if (event.once) {
      client.once(eventName, listenerFn);
    } else {
      client.on(eventName, listenerFn);
    }
    
    loadedEvents.add(`${folder}:${eventName}:${file}`);
    logger.debug(`Registered event handler: ${file} for event: ${eventName}`);
  }
}

/**
 * Remove any existing event listeners to prevent duplicates
 */
function cleanupExistingListeners(client) {
  for (const [eventName, listeners] of loadedEventListeners.entries()) {
    for (const listener of listeners) {
      client.removeListener(eventName, listener);
      logger.debug(`Removed existing listener for event: ${eventName}`);
    }
  }
  
  // Clear the map
  loadedEventListeners.clear();
}

/**
 * Log all registered event listeners for debugging
 */
function logRegisteredListeners(client) {
  const events = client.eventNames();
  for (const event of events) {
    const listenerCount = client.listenerCount(event);
    logger.debug(`Event ${event} has ${listenerCount} listener(s)`);
  }
}

module.exports = { loadEvents };
