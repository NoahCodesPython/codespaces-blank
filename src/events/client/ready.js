const { Events, ActivityType } = require('discord.js');
const logger = require('../../utils/logger');

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
      
      // Set bot status
      client.user.setPresence({
        activities: [{ 
          name: `${serverCount} servers | /help`,
          type: ActivityType.Watching
        }],
        status: 'online'
      });
      
      // Set status update interval (every hour)
      setInterval(() => {
        const newServerCount = client.guilds.cache.size;
        client.user.setPresence({
          activities: [{ 
            name: `${newServerCount} servers | /help`,
            type: ActivityType.Watching
          }],
          status: 'online'
        });
      }, 3600000); // Update every hour
      
    } catch (error) {
      logger.error(`Error in ready event: ${error}`);
    }
  }
};