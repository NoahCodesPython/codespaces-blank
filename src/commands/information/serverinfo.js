const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// Constants for verification and filter levels
const verificationLevels = {
  0: 'None',
  1: 'Low',
  2: 'Medium',
  3: 'High',
  4: 'Highest'
};

// Helper function to calculate days since creation
function getDaysAgo(date) {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / 86400000);
  return days + (days === 1 ? " day" : " days") + " ago";
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Display information about the current server'),
  
  category: 'information',
  usage: '/serverinfo',
  examples: ['/serverinfo'],
  aliases: ['server', 'si', 'guildinfo', 'info'],
  
  /**
   * Execute the command - Slash Command
   * @param {*} interaction - The interaction object
   */
  async execute(interaction) {
    const { guild } = interaction;
    
    // Get member counts
    const totalMembers = guild.memberCount;
    const humanCount = guild.members.cache.filter(member => !member.user.bot).size;
    const botCount = guild.members.cache.filter(member => member.user.bot).size;
    
    // Get channel counts
    const totalChannels = guild.channels.cache.size;
    const textChannels = guild.channels.cache.filter(ch => ch.type === 0).size;
    const voiceChannels = guild.channels.cache.filter(ch => ch.type === 2).size;
    const categoryChannels = guild.channels.cache.filter(ch => ch.type === 4).size;
    
    const embed = new EmbedBuilder()
      .setAuthor({ name: guild.name, iconURL: guild.iconURL({ dynamic: true }) })
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .setColor(interaction.guild.members.me.displayHexColor)
      .addFields(
        { name: 'Name', value: guild.name, inline: true },
        { name: 'ID', value: guild.id, inline: true },
        { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
        { name: 'Members', value: `Total: ${totalMembers}\nHumans: ${humanCount}\nBots: ${botCount}`, inline: true },
        { name: 'Channels', value: `Total: ${totalChannels}\nText: ${textChannels}\nVoice: ${voiceChannels}\nCategories: ${categoryChannels}`, inline: true },
        { name: 'Verification Level', value: verificationLevels[guild.verificationLevel], inline: true },
        { name: 'Roles', value: `${guild.roles.cache.size}`, inline: true },
        { name: 'Emojis', value: `${guild.emojis.cache.size}`, inline: true },
        { name: 'Boost Level', value: `${guild.premiumTier} (${guild.premiumSubscriptionCount} boosts)`, inline: true },
        { name: 'Created At', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>\n(${getDaysAgo(guild.createdAt)})`, inline: false }
      )
      .setFooter({ text: `Shard #${guild.shardId || 0}` })
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  },
  
  /**
   * Execute the command - Legacy Command
   * @param {*} message - The message object
   * @param {string[]} args - The message arguments
   * @param {*} client - The client object
   */
  async run(message, args, client) {
    const { guild } = message;
    
    // Get member counts
    const totalMembers = guild.memberCount;
    const humanCount = guild.members.cache.filter(member => !member.user.bot).size;
    const botCount = guild.members.cache.filter(member => member.user.bot).size;
    
    // Get channel counts
    const totalChannels = guild.channels.cache.size;
    const textChannels = guild.channels.cache.filter(ch => ch.type === 0).size;
    const voiceChannels = guild.channels.cache.filter(ch => ch.type === 2).size;
    const categoryChannels = guild.channels.cache.filter(ch => ch.type === 4).size;
    
    const embed = new EmbedBuilder()
      .setAuthor({ name: guild.name, iconURL: guild.iconURL({ dynamic: true }) })
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .setColor(message.guild.members.me.displayHexColor)
      .addFields(
        { name: 'Name', value: guild.name, inline: true },
        { name: 'ID', value: guild.id, inline: true },
        { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
        { name: 'Members', value: `Total: ${totalMembers}\nHumans: ${humanCount}\nBots: ${botCount}`, inline: true },
        { name: 'Channels', value: `Total: ${totalChannels}\nText: ${textChannels}\nVoice: ${voiceChannels}\nCategories: ${categoryChannels}`, inline: true },
        { name: 'Verification Level', value: verificationLevels[guild.verificationLevel], inline: true },
        { name: 'Roles', value: `${guild.roles.cache.size}`, inline: true },
        { name: 'Emojis', value: `${guild.emojis.cache.size}`, inline: true },
        { name: 'Boost Level', value: `${guild.premiumTier} (${guild.premiumSubscriptionCount} boosts)`, inline: true },
        { name: 'Created At', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>\n(${getDaysAgo(guild.createdAt)})`, inline: false }
      )
      .setFooter({ text: `Shard #${guild.shardId || 0}` })
      .setTimestamp();
    
    await message.channel.send({ embeds: [embed] });
  }
};