const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../../utils/logger');

module.exports = {
  name: 'members',
  description: 'Display member count information for the server',
  category: 'information',
  aliases: ['membercount', 'memberinfo', 'mc'],
  usage: '',
  examples: ['members'],
  userPermissions: [],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('members')
    .setDescription('Display member count information for the server'),
  
  // Slash command execution
  async execute(interaction) {
    try {
      const { guild } = interaction;
      
      // Fetch members to ensure we have accurate data
      await guild.members.fetch();
      
      // Calculate different member counts
      const totalMembers = guild.memberCount;
      const humans = guild.members.cache.filter(member => !member.user.bot).size;
      const bots = guild.members.cache.filter(member => member.user.bot).size;
      
      // Calculate online/offline counts
      const online = guild.members.cache.filter(member => member.presence?.status === 'online').size;
      const idle = guild.members.cache.filter(member => member.presence?.status === 'idle').size;
      const dnd = guild.members.cache.filter(member => member.presence?.status === 'dnd').size;
      const offline = guild.members.cache.filter(member => !member.presence || member.presence.status === 'offline').size;
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle(`${guild.name} Member Count`)
        .setColor('#3498db')
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .addFields(
          { 
            name: 'Members', 
            value: `👥 Total: **${totalMembers}**\n👤 Humans: **${humans}**\n🤖 Bots: **${bots}**`, 
            inline: true 
          },
          { 
            name: 'Status', 
            value: `🟢 Online: **${online}**\n🟡 Idle: **${idle}**\n🔴 Do Not Disturb: **${dnd}**\n⚫ Offline: **${offline}**`, 
            inline: true 
          }
        )
        .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing members command: ${error}`);
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
      
      // Fetch members to ensure we have accurate data
      await guild.members.fetch();
      
      // Calculate different member counts
      const totalMembers = guild.memberCount;
      const humans = guild.members.cache.filter(member => !member.user.bot).size;
      const bots = guild.members.cache.filter(member => member.user.bot).size;
      
      // Calculate online/offline counts
      const online = guild.members.cache.filter(member => member.presence?.status === 'online').size;
      const idle = guild.members.cache.filter(member => member.presence?.status === 'idle').size;
      const dnd = guild.members.cache.filter(member => member.presence?.status === 'dnd').size;
      const offline = guild.members.cache.filter(member => !member.presence || member.presence.status === 'offline').size;
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle(`${guild.name} Member Count`)
        .setColor('#3498db')
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .addFields(
          { 
            name: 'Members', 
            value: `👥 Total: **${totalMembers}**\n👤 Humans: **${humans}**\n🤖 Bots: **${bots}**`, 
            inline: true 
          },
          { 
            name: 'Status', 
            value: `🟢 Online: **${online}**\n🟡 Idle: **${idle}**\n🔴 Do Not Disturb: **${dnd}**\n⚫ Offline: **${offline}**`, 
            inline: true 
          }
        )
        .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      
      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing members command: ${error}`);
      message.reply('There was an error executing this command!');
    }
  }
};