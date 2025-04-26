const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { isOwner } = require('../../utils/ownerCheck');
const logger = require('../../utils/logger');

module.exports = {
  name: 'announce',
  description: 'Sends an announcement to all servers',
  category: 'owner',
  aliases: ['broadcast', 'announcement'],
  usage: '<message>',
  examples: ['announce The bot will be down for maintenance at 8 PM UTC'],
  userPermissions: [],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Sends an announcement to all servers')
    .addStringOption(option => 
      option.setName('message')
        .setDescription('The message to announce')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('title')
        .setDescription('The title of the announcement')
        .setRequired(false))
    .addStringOption(option => 
      option.setName('color')
        .setDescription('The color of the announcement embed')
        .setRequired(false)
        .addChoices(
          { name: 'Red', value: '#FF0000' },
          { name: 'Green', value: '#00FF00' },
          { name: 'Blue', value: '#0099ff' },
          { name: 'Yellow', value: '#FFFF00' },
          { name: 'Orange', value: '#FFA500' },
          { name: 'Purple', value: '#800080' }
        )),
  
  // Slash command execution
  async execute(interaction) {
    try {
      // Check if executor is a bot owner
      const isExecutorOwner = await isOwner(interaction.user.id);
      
      if (!isExecutorOwner) {
        return interaction.reply({
          content: 'You do not have permission to use this command.',
          ephemeral: true
        });
      }
      
      // Defer reply as this will take some time
      await interaction.deferReply();
      
      const message = interaction.options.getString('message');
      const title = interaction.options.getString('title') || 'Bot Announcement';
      const color = interaction.options.getString('color') || '#0099ff';
      
      // Create the announcement embed
      const announcementEmbed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(message)
        .setColor(color)
        .setFooter({ text: `Announced by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      
      // Get all guilds
      const guilds = interaction.client.guilds.cache;
      
      let sentCount = 0;
      let errorCount = 0;
      
      // Progress message
      await interaction.editReply(`Starting announcement broadcast to ${guilds.size} servers...`);
      
      // Send the announcement to each guild
      for (const [id, guild] of guilds) {
        try {
          // Find a suitable channel to send the announcement
          const systemChannel = guild.systemChannel;
          const generalChannel = guild.channels.cache.find(
            channel => 
              channel.type === 0 && // Text channel
              channel.name.toLowerCase().includes('general') &&
              channel.permissionsFor(guild.members.me).has(PermissionFlagsBits.SendMessages)
          );
          
          const announcementChannel = guild.channels.cache.find(
            channel => 
              channel.type === 0 && // Text channel
              (channel.name.toLowerCase().includes('announce') || 
               channel.name.toLowerCase().includes('notification')) &&
              channel.permissionsFor(guild.members.me).has(PermissionFlagsBits.SendMessages)
          );
          
          // Choose the best channel to send to
          const targetChannel = announcementChannel || systemChannel || generalChannel;
          
          if (targetChannel) {
            await targetChannel.send({ embeds: [announcementEmbed] });
            sentCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          logger.error(`Error sending announcement to guild ${id}: ${error}`);
          errorCount++;
        }
        
        // Update progress every 10 guilds
        if ((sentCount + errorCount) % 10 === 0 || (sentCount + errorCount) === guilds.size) {
          await interaction.editReply(
            `Announcement progress: ${sentCount + errorCount}/${guilds.size} servers processed ` +
            `(${sentCount} successful, ${errorCount} failed)`
          );
        }
      }
      
      // Final report
      const embed = new EmbedBuilder()
        .setTitle('Announcement Broadcast Complete')
        .setDescription(`Your announcement has been sent to ${sentCount} servers.`)
        .addFields(
          { name: 'Success Count', value: `${sentCount}/${guilds.size} servers`, inline: true },
          { name: 'Error Count', value: `${errorCount}/${guilds.size} servers`, inline: true }
        )
        .setColor('#00FF00')
        .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      
      await interaction.editReply({ content: '', embeds: [embed] });
      
      // Log the action
      logger.info(`${interaction.user.tag} (${interaction.user.id}) sent an announcement to ${sentCount} servers.`);
      
    } catch (error) {
      logger.error(`Error in announce command: ${error}`);
      
      if (interaction.deferred) {
        await interaction.editReply({ 
          content: 'There was an error sending the announcement.'
        });
      } else {
        await interaction.reply({ 
          content: 'There was an error executing this command!', 
          ephemeral: true 
        });
      }
    }
  },
  
  // Legacy command execution
  async run(client, message, args) {
    try {
      // Check if executor is a bot owner
      const isExecutorOwner = await isOwner(message.author.id);
      
      if (!isExecutorOwner) {
        return message.reply('You do not have permission to use this command.');
      }
      
      if (!args.length) {
        return message.reply('Please provide a message to announce.');
      }
      
      // We'll parse the message with a simple format:
      // !announce -t "Title" -c #colorhex Message content here
      let title = 'Bot Announcement';
      let color = '#0099ff';
      let announcementMessage = args.join(' ');
      
      // Parse title if provided
      if (announcementMessage.includes('-t "')) {
        const titleMatch = announcementMessage.match(/-t "(.*?)"/);
        if (titleMatch && titleMatch[1]) {
          title = titleMatch[1];
          announcementMessage = announcementMessage.replace(/-t "(.*?)"/, '').trim();
        }
      }
      
      // Parse color if provided
      if (announcementMessage.includes('-c ')) {
        const colorMatch = announcementMessage.match(/-c (#[a-fA-F0-9]{6}|#[a-fA-F0-9]{3})/);
        if (colorMatch && colorMatch[1]) {
          color = colorMatch[1];
          announcementMessage = announcementMessage.replace(/-c (#[a-fA-F0-9]{6}|#[a-fA-F0-9]{3})/, '').trim();
        }
      }
      
      // Create the announcement embed
      const announcementEmbed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(announcementMessage)
        .setColor(color)
        .setFooter({ text: `Announced by ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      
      // Get all guilds
      const guilds = client.guilds.cache;
      
      let sentCount = 0;
      let errorCount = 0;
      
      // Progress message
      const progressMessage = await message.reply(`Starting announcement broadcast to ${guilds.size} servers...`);
      
      // Send the announcement to each guild
      for (const [id, guild] of guilds) {
        try {
          // Find a suitable channel to send the announcement
          const systemChannel = guild.systemChannel;
          const generalChannel = guild.channels.cache.find(
            channel => 
              channel.type === 0 && // Text channel
              channel.name.toLowerCase().includes('general') &&
              channel.permissionsFor(guild.members.me).has(PermissionFlagsBits.SendMessages)
          );
          
          const announcementChannel = guild.channels.cache.find(
            channel => 
              channel.type === 0 && // Text channel
              (channel.name.toLowerCase().includes('announce') || 
               channel.name.toLowerCase().includes('notification')) &&
              channel.permissionsFor(guild.members.me).has(PermissionFlagsBits.SendMessages)
          );
          
          // Choose the best channel to send to
          const targetChannel = announcementChannel || systemChannel || generalChannel;
          
          if (targetChannel) {
            await targetChannel.send({ embeds: [announcementEmbed] });
            sentCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          logger.error(`Error sending announcement to guild ${id}: ${error}`);
          errorCount++;
        }
        
        // Update progress every 10 guilds
        if ((sentCount + errorCount) % 10 === 0 || (sentCount + errorCount) === guilds.size) {
          await progressMessage.edit(
            `Announcement progress: ${sentCount + errorCount}/${guilds.size} servers processed ` +
            `(${sentCount} successful, ${errorCount} failed)`
          );
        }
      }
      
      // Final report
      const embed = new EmbedBuilder()
        .setTitle('Announcement Broadcast Complete')
        .setDescription(`Your announcement has been sent to ${sentCount} servers.`)
        .addFields(
          { name: 'Success Count', value: `${sentCount}/${guilds.size} servers`, inline: true },
          { name: 'Error Count', value: `${errorCount}/${guilds.size} servers`, inline: true }
        )
        .setColor('#00FF00')
        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      
      await progressMessage.edit({ content: '', embeds: [embed] });
      
      // Log the action
      logger.info(`${message.author.tag} (${message.author.id}) sent an announcement to ${sentCount} servers.`);
      
    } catch (error) {
      logger.error(`Error in legacy announce command: ${error}`);
      message.reply('There was an error sending the announcement.');
    }
  }
};