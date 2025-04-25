const { EmbedBuilder } = require('discord.js');
const Reminder = require('../models/Reminder');
const logger = require('../utils/logger');

/**
 * Initialize the reminder handler to check for due reminders periodically
 * @param {Client} client - Discord.js client
 */
function initReminderHandler(client) {
  logger.info('Initializing reminder handler');
  
  // Check for reminders every minute
  setInterval(async () => {
    try {
      // Find all reminders that are due
      const now = new Date();
      const dueReminders = await Reminder.find({ time: { $lte: now } });
      
      if (dueReminders.length === 0) return;
      
      logger.info(`Processing ${dueReminders.length} due reminders`);
      
      // Process each reminder
      for (const reminder of dueReminders) {
        try {
          // Get user
          const user = await client.users.fetch(reminder.userID).catch(() => null);
          
          if (!user) {
            logger.warn(`Could not find user ${reminder.userID} for reminder ${reminder.reminderID}`);
            await Reminder.deleteOne({ reminderID: reminder.reminderID });
            continue;
          }
          
          // Create embed
          const embed = new EmbedBuilder()
            .setTitle('⏰ Reminder')
            .setDescription(reminder.reminder)
            .setColor('#0099ff')
            .setFooter({ text: `Reminder set at` })
            .setTimestamp(reminder.createdAt);
          
          // Send DM to user
          await user.send({ embeds: [embed] }).catch(() => {});
          
          // Try to send to the original channel if available
          try {
            const guild = await client.guilds.fetch(reminder.guildID);
            
            if (guild) {
              const channel = await guild.channels.fetch(reminder.channelID);
              
              if (channel) {
                await channel.send({
                  content: `<@${user.id}>, here's your reminder:`,
                  embeds: [embed]
                });
              }
            }
          } catch (channelError) {
            logger.warn(`Could not send reminder to channel: ${channelError}`);
          }
          
          // Delete the reminder
          await Reminder.deleteOne({ reminderID: reminder.reminderID });
          
        } catch (reminderError) {
          logger.error(`Error processing reminder ${reminder.reminderID}: ${reminderError}`);
        }
      }
      
    } catch (error) {
      logger.error(`Error in reminder handler: ${error}`);
    }
  }, 60000); // Check every minute
  
  logger.info('Reminder handler initialized');
}

module.exports = { initReminderHandler };