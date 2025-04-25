const { ActivityType } = require('discord.js');
const logger = require('../../utils/logger');

module.exports = {
  name: 'ready',
  once: true,
  
  async execute(client) {
    try {
      // Set bot activity
      client.user.setPresence({
        activities: [{ 
          name: `${client.config.prefix}help | ${client.guilds.cache.size} servers`,
          type: ActivityType.Watching
        }],
        status: 'online'
      });
      
      // Log client info
      logger.info(`${client.user.tag} is online!`);
      logger.info(`Serving ${client.guilds.cache.size} guilds and ${client.users.cache.size} users`);
      
      // Update activity every 10 minutes (600000ms)
      setInterval(() => {
        client.user.setPresence({
          activities: [{ 
            name: `${client.config.prefix}help | ${client.guilds.cache.size} servers`,
            type: ActivityType.Watching
          }],
          status: 'online'
        });
      }, 600000);
      
    } catch (error) {
      logger.error(`Error in ready event: ${error}`);
    }
  }
};