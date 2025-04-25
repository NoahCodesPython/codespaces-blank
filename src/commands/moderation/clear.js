const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const Guild = require('../../models/Guild');
const logger = require('../../utils/logger');

module.exports = {
  name: 'clear',
  description: 'Delete the specified amount of messages',
  category: 'moderation',
  aliases: ['purge', 'c'],
  usage: '[channel] [user] <message-count> [reason]',
  examples: ['clear 20', 'clear #general 10', 'clear @User 50', 'clear #general @User 5'],
  userPermissions: [PermissionFlagsBits.ManageMessages],
  botPermissions: [PermissionFlagsBits.ManageMessages],
  
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Delete the specified amount of messages')
    .addIntegerOption(option => 
      option.setName('amount')
        .setDescription('Number of messages to delete (1-100)')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true))
    .addChannelOption(option => 
      option.setName('channel')
        .setDescription('Channel to delete messages from')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false))
    .addUserOption(option => 
      option.setName('user')
        .setDescription('Only delete messages from this user')
        .setRequired(false))
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('Reason for deleting messages')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  
  // Slash command execution
  async execute(client, interaction) {
    try {
      // Get options
      const amount = interaction.options.getInteger('amount');
      const channel = interaction.options.getChannel('channel') || interaction.channel;
      const targetUser = interaction.options.getUser('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      
      // Check if channel is a text channel
      if (channel.type !== ChannelType.GuildText) {
        return interaction.reply({ 
          content: 'I can only delete messages in text channels.', 
          ephemeral: true 
        });
      }
      
      // Check if bot has permissions in the channel
      if (!channel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.ManageMessages)) {
        return interaction.reply({ 
          content: 'I don\'t have permission to manage messages in that channel.', 
          ephemeral: true 
        });
      }
      
      // Defer reply to give time for the operation
      await interaction.deferReply({ ephemeral: true });
      
      let messagesToDelete;
      let deletedMessages = 0;
      
      // Fetch messages and filter if needed
      if (targetUser) {
        const fetchedMessages = await channel.messages.fetch({ limit: 100 });
        const filteredMessages = fetchedMessages.filter(msg => msg.author.id === targetUser.id);
        messagesToDelete = filteredMessages.first(amount);
        deletedMessages = messagesToDelete.length;
      } else {
        // Delete amount+1 to include the command message if in the same channel
        messagesToDelete = amount;
        deletedMessages = amount;
      }
      
      // Delete messages
      await channel.bulkDelete(messagesToDelete, true)
        .then(deletedMsgs => {
          const embed = new EmbedBuilder()
            .setDescription(`✅ Successfully deleted **${deletedMsgs.size}** message(s)${reason !== 'No reason provided' ? `\n\n**Reason:** ${reason}` : ''}`)
            .setColor('#00FF00')
            .setTimestamp();
          
          if (targetUser) {
            embed.addFields(
              { name: 'User', value: `${targetUser.tag}`, inline: true },
              { name: 'Channel', value: `${channel}`, inline: true },
              { name: 'Messages Deleted', value: `${deletedMsgs.size}`, inline: true }
            );
          } else {
            embed.addFields(
              { name: 'Channel', value: `${channel}`, inline: true },
              { name: 'Messages Deleted', value: `${deletedMsgs.size}`, inline: true }
            );
          }
          
          interaction.editReply({ embeds: [embed] });
          
          // Send a temporary message to the channel
          if (channel.id !== interaction.channel.id) {
            channel.send({ 
              embeds: [
                new EmbedBuilder()
                  .setDescription(`✅ **${interaction.user.tag}** cleared **${deletedMsgs.size}** messages in this channel.`)
                  .setColor('#00FF00')
              ] 
            }).then(msg => {
              setTimeout(() => msg.delete().catch(() => {}), 5000);
            });
          }
        })
        .catch(error => {
          if (error.code === 50034) { // Messages are too old
            interaction.editReply('Some messages could not be deleted because they are older than 14 days.');
          } else {
            logger.error(`Error deleting messages: ${error}`);
            interaction.editReply('There was an error deleting the messages.');
          }
        });
      
    } catch (error) {
      logger.error(`Error executing clear command: ${error}`);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: 'There was an error executing this command!' });
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
      // Get guild data from database
      const guildData = await Guild.findOne({ guildId: message.guild.id });
      
      // Check if channel mention or ID is provided
      let channel = message.mentions.channels.first();
      if (!channel && args[0] && /^\d+$/.test(args[0])) {
        channel = message.guild.channels.cache.get(args[0]);
      }
      
      // If a channel was found, shift args
      if (channel) {
        args.shift();
      } else {
        channel = message.channel;
      }
      
      // Check if channel is a text channel
      if (channel.type !== ChannelType.GuildText) {
        return message.reply('I can only delete messages in text channels.');
      }
      
      // Check if bot has permissions in the channel
      if (!channel.permissionsFor(message.guild.members.me).has(PermissionFlagsBits.ManageMessages)) {
        return message.reply('I don\'t have permission to manage messages in that channel.');
      }
      
      // Check for user mention
      const member = message.mentions.members.first();
      if (member) {
        args.shift();
      }
      
      // Get amount of messages to delete
      const amount = parseInt(args[0]);
      if (isNaN(amount) || amount < 1 || amount > 100) {
        return message.reply('Please provide a number between 1 and 100 for the number of messages to delete.');
      }
      
      // Get reason
      let reason = args.slice(1).join(' ');
      if (!reason) reason = 'No reason provided';
      if (reason.length > 1024) reason = reason.slice(0, 1021) + '...';
      
      // Delete the command message
      await message.delete().catch(() => {});
      
      // Fetch and delete messages
      let messagesToDelete;
      if (member) {
        // Fetch messages and filter by user
        const fetchedMessages = await channel.messages.fetch({ limit: 100 });
        const filteredMessages = fetchedMessages.filter(msg => msg.author.id === member.id);
        messagesToDelete = filteredMessages.first(amount);
      } else {
        // Delete specified amount of messages
        messagesToDelete = amount;
      }
      
      // Bulk delete messages
      await channel.bulkDelete(messagesToDelete, true)
        .then(deletedMsgs => {
          // Create and send response embed
          const embed = new EmbedBuilder()
            .setDescription(`✅ Successfully deleted **${deletedMsgs.size}** message(s)${reason !== 'No reason provided' ? `\n\n**Reason:** ${reason}` : ''}`)
            .setColor('#00FF00')
            .setTimestamp();
            
          if (member) {
            embed.addFields(
              { name: 'User', value: `${member.user.tag}`, inline: true },
              { name: 'Channel', value: `${channel}`, inline: true },
              { name: 'Messages Deleted', value: `${deletedMsgs.size}`, inline: true }
            );
          } else {
            embed.addFields(
              { name: 'Channel', value: `${channel}`, inline: true },
              { name: 'Messages Deleted', value: `${deletedMsgs.size}`, inline: true }
            );
          }
          
          channel.send({ embeds: [embed] }).then(msg => {
            setTimeout(() => msg.delete().catch(() => {}), 5000);
          });
        })
        .catch(error => {
          if (error.code === 50034) { // Messages are too old
            message.channel.send('Some messages could not be deleted because they are older than 14 days.')
              .then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
          } else {
            logger.error(`Error deleting messages: ${error}`);
            message.channel.send('There was an error deleting the messages.')
              .then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
          }
        });
      
    } catch (error) {
      logger.error(`Error executing clear command: ${error}`);
      message.channel.send('There was an error executing this command.')
        .then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
    }
  }
};