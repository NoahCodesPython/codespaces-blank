const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../../utils/logger');
const ms = require('ms');

module.exports = {
  name: 'uptime',
  description: 'Display how long the bot has been online',
  category: 'information',
  aliases: ['online', 'up'],
  usage: '',
  examples: ['uptime'],
  userPermissions: [],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('uptime')
    .setDescription('Display how long the bot has been online'),
  
  // Slash command execution
  async execute(interaction) {
    try {
      const uptime = interaction.client.uptime;
      const botUpSince = new Date(Date.now() - uptime);
      const uptimeTimestamp = Math.floor(botUpSince.getTime() / 1000);
      
      // Format uptime
      const days = Math.floor(uptime / 86400000);
      const hours = Math.floor(uptime / 3600000) % 24;
      const minutes = Math.floor(uptime / 60000) % 60;
      const seconds = Math.floor(uptime / 1000) % 60;
      
      const formattedUptime = `${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds`;
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle('Bot Uptime')
        .setDescription(`⏰ I've been online for ${formattedUptime}`)
        .addFields(
          { name: 'Started', value: `<t:${uptimeTimestamp}:F> (<t:${uptimeTimestamp}:R>)` }
        )
        .setColor('#3498db')
        .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing uptime command: ${error}`);
      await interaction.reply({ 
        content: 'There was an error executing this command!', 
        ephemeral: true 
      });
    }
  },
  
  // Legacy command execution
  async run(client, message, args) {
    try {
      const uptime = client.uptime;
      const botUpSince = new Date(Date.now() - uptime);
      const uptimeTimestamp = Math.floor(botUpSince.getTime() / 1000);
      
      // Format uptime
      const days = Math.floor(uptime / 86400000);
      const hours = Math.floor(uptime / 3600000) % 24;
      const minutes = Math.floor(uptime / 60000) % 60;
      const seconds = Math.floor(uptime / 1000) % 60;
      
      const formattedUptime = `${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds`;
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle('Bot Uptime')
        .setDescription(`⏰ I've been online for ${formattedUptime}`)
        .addFields(
          { name: 'Started', value: `<t:${uptimeTimestamp}:F> (<t:${uptimeTimestamp}:R>)` }
        )
        .setColor('#3498db')
        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      
      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing uptime command: ${error}`);
      message.reply('There was an error executing this command!');
    }
  }
};