const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../../utils/logger');

module.exports = {
  name: 'serverinfo',
  description: 'Display information about the server',
  category: 'information',
  aliases: ['server', 'guildinfo', 'guild'],
  usage: '',
  examples: ['serverinfo'],
  userPermissions: [],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Display information about the server'),
  
  // Slash command execution
  async execute(interaction) {
    try {
      const { guild } = interaction;
      
      // Fetch member count information
      const totalMembers = guild.memberCount;
      const botCount = guild.members.cache.filter(member => member.user.bot).size;
      const humanCount = totalMembers - botCount;
      
      // Calculate server age
      const createdTimestamp = Math.floor(guild.createdAt.getTime() / 1000);
      
      // Fetch channel information
      await guild.channels.fetch();
      const textChannels = guild.channels.cache.filter(channel => channel.type === 0).size;
      const voiceChannels = guild.channels.cache.filter(channel => channel.type === 2).size;
      const categoryChannels = guild.channels.cache.filter(channel => channel.type === 4).size;
      const forumChannels = guild.channels.cache.filter(channel => channel.type === 15).size;
      const threadChannels = guild.channels.cache.filter(channel => [11, 12].includes(channel.type)).size;
      
      // Fetch role information
      await guild.roles.fetch();
      const roleCount = guild.roles.cache.size - 1; // Subtract @everyone role
      
      // Fetch emoji information
      await guild.emojis.fetch();
      const emojiCount = guild.emojis.cache.size;
      const animatedEmojiCount = guild.emojis.cache.filter(emoji => emoji.animated).size;
      const staticEmojiCount = emojiCount - animatedEmojiCount;
      
      // Get boost information
      const boostLevel = guild.premiumTier ? `Level ${guild.premiumTier}` : 'Level 0';
      const boostCount = guild.premiumSubscriptionCount || 0;
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle(`${guild.name} Server Information`)
        .setDescription(`**ID:** ${guild.id}`)
        .setColor('#3498db')
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .addFields(
          { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
          { name: 'Created On', value: `<t:${createdTimestamp}:F>\n(<t:${createdTimestamp}:R>)`, inline: true },
          { name: 'Boost Status', value: `${boostLevel} (${boostCount} boosts)`, inline: true },
          { name: 'Members', value: `Total: ${totalMembers}\nHumans: ${humanCount}\nBots: ${botCount}`, inline: true },
          { name: 'Channels', value: `Categories: ${categoryChannels}\nText: ${textChannels}\nVoice: ${voiceChannels}\nForum: ${forumChannels}\nThreads: ${threadChannels}`, inline: true },
          { name: 'Other', value: `Roles: ${roleCount}\nEmojis: ${emojiCount} (${staticEmojiCount} static, ${animatedEmojiCount} animated)`, inline: true }
        )
        .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      
      // Add server banner and discovery splash if available
      if (guild.banner) {
        embed.setImage(guild.bannerURL({ size: 512 }));
      }
      
      // Send the embed
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing serverinfo command: ${error}`);
      await interaction.reply({ 
        content: 'There was an error executing this command!', 
        ephemeral: true 
      });
    }
  },
  
  // Legacy command execution
  async run(client, message, args) {
    try {
      const { guild } = message;
      
      // Fetch member count information
      const totalMembers = guild.memberCount;
      const botCount = guild.members.cache.filter(member => member.user.bot).size;
      const humanCount = totalMembers - botCount;
      
      // Calculate server age
      const createdTimestamp = Math.floor(guild.createdAt.getTime() / 1000);
      
      // Fetch channel information
      await guild.channels.fetch();
      const textChannels = guild.channels.cache.filter(channel => channel.type === 0).size;
      const voiceChannels = guild.channels.cache.filter(channel => channel.type === 2).size;
      const categoryChannels = guild.channels.cache.filter(channel => channel.type === 4).size;
      const forumChannels = guild.channels.cache.filter(channel => channel.type === 15).size;
      const threadChannels = guild.channels.cache.filter(channel => [11, 12].includes(channel.type)).size;
      
      // Fetch role information
      await guild.roles.fetch();
      const roleCount = guild.roles.cache.size - 1; // Subtract @everyone role
      
      // Fetch emoji information
      await guild.emojis.fetch();
      const emojiCount = guild.emojis.cache.size;
      const animatedEmojiCount = guild.emojis.cache.filter(emoji => emoji.animated).size;
      const staticEmojiCount = emojiCount - animatedEmojiCount;
      
      // Get boost information
      const boostLevel = guild.premiumTier ? `Level ${guild.premiumTier}` : 'Level 0';
      const boostCount = guild.premiumSubscriptionCount || 0;
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle(`${guild.name} Server Information`)
        .setDescription(`**ID:** ${guild.id}`)
        .setColor('#3498db')
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .addFields(
          { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
          { name: 'Created On', value: `<t:${createdTimestamp}:F>\n(<t:${createdTimestamp}:R>)`, inline: true },
          { name: 'Boost Status', value: `${boostLevel} (${boostCount} boosts)`, inline: true },
          { name: 'Members', value: `Total: ${totalMembers}\nHumans: ${humanCount}\nBots: ${botCount}`, inline: true },
          { name: 'Channels', value: `Categories: ${categoryChannels}\nText: ${textChannels}\nVoice: ${voiceChannels}\nForum: ${forumChannels}\nThreads: ${threadChannels}`, inline: true },
          { name: 'Other', value: `Roles: ${roleCount}\nEmojis: ${emojiCount} (${staticEmojiCount} static, ${animatedEmojiCount} animated)`, inline: true }
        )
        .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      
      // Add server banner and discovery splash if available
      if (guild.banner) {
        embed.setImage(guild.bannerURL({ size: 512 }));
      }
      
      // Send the embed
      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing serverinfo command: ${error}`);
      message.reply('There was an error executing this command!');
    }
  }
};