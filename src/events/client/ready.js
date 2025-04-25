const { Events, ActivityType } = require('discord.js');
const logger = require('../../utils/logger');
const config = require('../../config');
const BotOwner = require('../../models/BotOwner');
const { addOwner } = require('../../utils/ownerCheck');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    try {
      // Log bot information
      logger.info(`Logged in as ${client.user.tag}`);
      
      // Get server and user count
      const serverCount = client.guilds.cache.size;
      const userCount = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
      logger.info(`Aquire is serving ${serverCount} servers with ${userCount} users`);
      
      // Ensure default owner is set
      try {
        // Check if owner exists first
        const existingOwner = await BotOwner.findOne({ userID: config.ownerID });
        if (!existingOwner) {
          // Add owner if not found
          const result = await addOwner(config.ownerID, config.ownerID, ["*"]);
          logger.info(`Default owner setup: ${result.success ? 'Success' : result.message}`);
        } else {
          logger.debug('Default owner already exists in database');
        }
      } catch (error) {
        logger.error(`Error setting up default owner: ${error}`);
      }
      
      // Define rotating statuses
      const activities = [
        { 
          name: `${serverCount} servers | /help`,
          type: ActivityType.Watching
        },
        { 
          name: `with ${userCount} users`,
          type: ActivityType.Playing
        },
        { 
          name: `/help for commands`,
          type: ActivityType.Listening
        },
        { 
          name: `Made by ${config.ownerName}`,
          type: ActivityType.Competing
        },
        { 
          name: `Providing premium Discord services`,
          type: ActivityType.Streaming
        }
      ];
      
      let currentIndex = 0;
      
      // Set initial status
      client.user.setPresence({
        activities: [activities[currentIndex]],
        status: 'online'
      });
      logger.info(`Initial bot activity set to: ${activities[currentIndex].name} (${activities[currentIndex].type})`);
      
      // Set status update interval (every 2 minutes)
      setInterval(() => {
        // Update server and user count in real-time
        const newServerCount = client.guilds.cache.size;
        const newUserCount = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
        
        // Update activity data with fresh counts
        activities[0].name = `${newServerCount} servers | /help`;
        activities[1].name = `with ${newUserCount} users`;
        
        // Rotate to next status
        currentIndex = (currentIndex + 1) % activities.length;
        
        // Set new presence
        client.user.setPresence({
          activities: [activities[currentIndex]],
          status: 'online'
        });
        
        // Log the activity change with activity type name for better debugging
        const activityTypeName = ActivityType[activities[currentIndex].type];
        logger.info(`Rotated bot activity to: ${activities[currentIndex].name} (${activityTypeName})`);
      }, 120000); // Update every 2 minutes
      
    } catch (error) {
      logger.error(`Error in ready event: ${error}`);
    }
  }
};