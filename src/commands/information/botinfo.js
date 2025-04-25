const { SlashCommandBuilder, EmbedBuilder, version: djsVersion } = require('discord.js');
const { stripIndent } = require('common-tags');
const os = require('os');
const moment = require('moment');
const { version } = require('../../../package.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('botinfo')
    .setDescription('Displays information about the bot'),
  
  category: 'information',
  usage: '/botinfo',
  examples: ['/botinfo'],
  aliases: ['stats', 'bi', 'about'],
  
  /**
   * Execute the command - Slash Command
   * @param {*} interaction - The interaction object
   */
  async execute(interaction) {
    await interaction.deferReply();
    
    // Get uptime
    const uptime = formatUptime(interaction.client.uptime);
    
    // Get memory usage
    const memoryUsage = process.memoryUsage();
    const heapUsed = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
    const rss = (memoryUsage.rss / 1024 / 1024).toFixed(2);
    
    // Get CPU and OS info
    const cpuCount = os.cpus().length;
    const cpuModel = os.cpus()[0].model;
    const cpuUsage = process.cpuUsage();
    const cpuUsagePercent = ((cpuUsage.user + cpuUsage.system) / 1000000).toFixed(2);
    
    // Get server stats
    const serverStats = stripIndent`
      OS -- ${os.platform()} ${os.release()}
      CPU -- ${cpuModel}
      Cores -- ${cpuCount}
      CPU Usage -- ${cpuUsagePercent} %
      RAM -- ${Math.round(os.totalmem() / 1024 / 1024 / 1024)} GB
      RAM Usage -- ${heapUsed} MB (Heap) / ${rss} MB (RSS)
    `;
    
    // Get bot stats
    const botStats = stripIndent`
      Ping -- ${Math.round(interaction.client.ws.ping)}ms
      Uptime -- ${uptime}
      Version -- ${version || '1.0.0'}
      Library -- Discord.js v${djsVersion}
      Environment -- Node.js ${process.version}
      Servers -- ${interaction.client.guilds.cache.size}
      Users -- ${interaction.client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)}
      Channels -- ${interaction.client.channels.cache.size}
      Commands -- ${interaction.client.application.commands.cache.size || 'N/A'}
    `;
    
    // Bot team info
    const botTeam = stripIndent`
      Owner
     • Peter (@peter)
      
      Developers
     • Alex (@alex)
    `;
    
    const embed = new EmbedBuilder()
      .setAuthor({ name: interaction.client.user.username, iconURL: interaction.client.user.displayAvatarURL() })
      .setTitle('Bot Information')
      .addFields(
        { name: 'General', value: `\`\`\`css\n${botStats}\`\`\``, inline: false },
        { name: 'System', value: `\`\`\`css\n${serverStats}\`\`\``, inline: false },
        { name: 'Team', value: `\`\`\`css\n${botTeam}\`\`\``, inline: false }
      )
      .setColor(interaction.guild.members.me.displayHexColor)
      .setFooter({ text: `Shard #${interaction.guild.shardId || 0}` })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
  },
  
  /**
   * Execute the command - Legacy Command
   * @param {*} message - The message object
   * @param {string[]} args - The message arguments
   * @param {*} client - The client object
   */
  async run(message, args, client) {
    // Get uptime
    const uptime = formatUptime(client.uptime);
    
    // Get memory usage
    const memoryUsage = process.memoryUsage();
    const heapUsed = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
    const rss = (memoryUsage.rss / 1024 / 1024).toFixed(2);
    
    // Get CPU and OS info
    const cpuCount = os.cpus().length;
    const cpuModel = os.cpus()[0].model;
    const cpuUsage = process.cpuUsage();
    const cpuUsagePercent = ((cpuUsage.user + cpuUsage.system) / 1000000).toFixed(2);
    
    // Get server stats
    const serverStats = stripIndent`
      OS -- ${os.platform()} ${os.release()}
      CPU -- ${cpuModel}
      Cores -- ${cpuCount}
      CPU Usage -- ${cpuUsagePercent} %
      RAM -- ${Math.round(os.totalmem() / 1024 / 1024 / 1024)} GB
      RAM Usage -- ${heapUsed} MB (Heap) / ${rss} MB (RSS)
    `;
    
    // Get bot stats
    const botStats = stripIndent`
      Ping -- ${Math.round(client.ws.ping)}ms
      Uptime -- ${uptime}
      Version -- ${version || '1.0.0'}
      Library -- Discord.js v${djsVersion}
      Environment -- Node.js ${process.version}
      Servers -- ${client.guilds.cache.size}
      Users -- ${client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)}
      Channels -- ${client.channels.cache.size}
      Commands -- ${client.commands ? client.commands.size : 'N/A'}
    `;
    
    // Bot team info
    const botTeam = stripIndent`
      Owner
     • Peter (@peter)
      
      Developers
     • Alex (@alex)
    `;
    
    const embed = new EmbedBuilder()
      .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
      .setTitle('Bot Information')
      .addFields(
        { name: 'General', value: `\`\`\`css\n${botStats}\`\`\``, inline: false },
        { name: 'System', value: `\`\`\`css\n${serverStats}\`\`\``, inline: false },
        { name: 'Team', value: `\`\`\`css\n${botTeam}\`\`\``, inline: false }
      )
      .setColor(message.guild.members.me.displayHexColor)
      .setFooter({ text: `Shard #${message.guild.shardId || 0}` })
      .setTimestamp();
    
    await message.channel.send({ embeds: [embed] });
  }
};

/**
 * Format the uptime into a readable string
 * @param {number} ms - Uptime in milliseconds
 * @returns {string} Formatted uptime string
 */
function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (days) {
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  }
  
  if (hours) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  
  if (minutes) {
    return `${minutes}m ${secs}s`;
  }
  
  return `${secs}s`;
}