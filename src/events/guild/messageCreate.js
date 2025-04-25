const { Collection } = require('discord.js');
const Guild = require('../../models/Guild');
const logger = require('../../utils/logger');

module.exports = {
  name: 'messageCreate',
  once: false,
  
  async execute(client, message) {
    try {
      // Ignore bots and non-guild messages
      if (message.author.bot || !message.guild) return;
      
      // Get guild prefix from database or use default
      let prefix = client.config?.prefix || '!';
      try {
        const guildData = await Guild.findOne({ guildID: message.guild.id });
        if (guildData && guildData.prefix) {
          prefix = guildData.prefix;
        }
      } catch (error) {
        logger.error(`Error fetching guild prefix: ${error}`);
      }
      
      // Check if message starts with prefix or bot mention
      const mentionRegex = new RegExp(`^<@!?${client.user.id}>( |)$`);
      const mentionWithPrefix = new RegExp(`^<@!?${client.user.id}> `);
      
      // Respond to mention
      if (mentionRegex.test(message.content)) {
        return message.reply(`My prefix for this server is \`${prefix}\``);
      }
      
      // Get prefix
      const usedPrefix = message.content.match(mentionWithPrefix) ? 
        message.content.match(mentionWithPrefix)[0] : 
        message.content.startsWith(prefix) ? prefix : null;
      
      // Return if no prefix
      if (!usedPrefix) return;
      
      // Get command and arguments
      const args = message.content.slice(usedPrefix.length).trim().split(/ +/g);
      const commandName = args.shift().toLowerCase();
      
      // Find command by name or alias
      const command = client.commands.get(commandName) || 
                      client.commands.get(client.aliases.get(commandName));
      
      if (!command) return;
      
      // Initialize cooldowns if they don't exist
      if (!client.cooldowns) client.cooldowns = new Collection();
      
      // Check command cooldowns
      if (!client.cooldowns.has(command.name)) {
        client.cooldowns.set(command.name, new Collection());
      }
      
      const now = Date.now();
      const timestamps = client.cooldowns.get(command.name);
      const cooldownAmount = (command.cooldown || 3) * 1000;
      
      if (timestamps.has(message.author.id)) {
        const expirationTime = timestamps.get(message.author.id) + cooldownAmount;
        
        if (now < expirationTime) {
          const timeLeft = (expirationTime - now) / 1000;
          return message.reply(`Please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${command.name}\` command.`);
        }
      }
      
      timestamps.set(message.author.id, now);
      setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
      
      // Check user permissions
      if (command.userPermissions && command.userPermissions.length > 0) {
        if (!message.member.permissions.has(command.userPermissions)) {
          return message.reply('You do not have permission to use this command!');
        }
      }
      
      // Check bot permissions
      if (command.botPermissions && command.botPermissions.length > 0) {
        const missingPermissions = [];
        
        for (const permission of command.botPermissions) {
          if (!message.guild.members.me.permissions.has(permission)) {
            missingPermissions.push(permission);
          }
        }
        
        if (missingPermissions.length > 0) {
          return message.reply(`I'm missing the following permissions: ${missingPermissions.join(', ')}`);
        }
      }
      
      // Execute command
      if (command.run) {
        await command.run(message, args, client);
      } else {
        logger.error(`Command ${command.name} does not have a run method`);
        message.reply('There was an error trying to execute that command!');
      }
      
    } catch (error) {
      logger.error(`Error with message: ${error}`);
      console.error(error);
    }
  }
};