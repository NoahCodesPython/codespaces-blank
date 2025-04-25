const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const ReactionRole = require('../../models/reactionrole/ReactionRole');
const logger = require('../../utils/logger');

module.exports = {
  name: 'reactionrolelist',
  description: 'List all reaction role messages in the server',
  category: 'reactionrole',
  aliases: ['rrlist', 'listrr'],
  usage: '',
  examples: ['reactionrolelist'],
  userPermissions: [PermissionFlagsBits.ManageRoles],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('reactionrolelist')
    .setDescription('List all reaction role messages in the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  
  // Slash command execution
  async execute(interaction) {
    try {
      // Check permissions
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
        return interaction.reply({
          content: 'You need the **Manage Roles** permission to use this command!',
          ephemeral: true
        });
      }
      
      // Defer the reply to give time to fetch the data
      await interaction.deferReply();
      
      // Get all reaction roles for this guild
      const reactionRoles = await ReactionRole.find({ guildID: interaction.guildId });
      
      if (!reactionRoles.length) {
        return interaction.editReply('There are no reaction role messages set up in this server.');
      }
      
      // Create pages for each reaction role message
      const pages = [];
      
      for (const reactionRole of reactionRoles) {
        // Get the channel
        const channel = await interaction.guild.channels.fetch(reactionRole.channelID).catch(() => null);
        const channelName = channel ? `#${channel.name}` : 'Unknown channel';
        
        // Try to get the message
        let messageUrl = 'Unknown message';
        let messageContent = 'Message not found or inaccessible';
        
        if (channel) {
          try {
            const message = await channel.messages.fetch(reactionRole.messageID);
            messageUrl = message.url;
            messageContent = message.embeds.length > 0 
              ? `**${message.embeds[0].title || 'No title'}**\n${message.embeds[0].description || 'No description'}`
              : message.content || 'No content';
          } catch (err) {
            logger.warn(`Could not fetch message for reaction role: ${err}`);
          }
        }
        
        // Create role list
        const roleList = [];
        for (const reaction of reactionRole.reactions) {
          const role = await interaction.guild.roles.fetch(reaction.roleID).catch(() => null);
          const roleName = role ? role.name : 'Unknown role';
          const roleDescription = reaction.roleDescription ? ` - ${reaction.roleDescription}` : '';
          
          roleList.push(`${reaction.emoji} <@&${reaction.roleID}> (${roleName})${roleDescription}`);
        }
        
        // Create embed
        const embed = new EmbedBuilder()
          .setTitle('Reaction Role Information')
          .setDescription(`**Message Link:** [Click to view](${messageUrl})\n**Type:** ${reactionRole.type}\n**Channel:** ${channelName}\n\n**Preview:**\n${messageContent.substring(0, 200)}${messageContent.length > 200 ? '...' : ''}`)
          .setColor('#3498db')
          .addFields({
            name: 'Reactions',
            value: roleList.join('\n') || 'No reactions'
          })
          .setFooter({ text: `ID: ${reactionRole.messageID}` })
          .setTimestamp();
        
        pages.push(embed);
      }
      
      // If only one page, just send it
      if (pages.length === 1) {
        return interaction.editReply({ embeds: [pages[0]] });
      }
      
      // Otherwise, set up pagination
      let currentPage = 0;
      
      const embed = pages[currentPage]
        .setFooter({ text: `ID: ${reactionRoles[currentPage].messageID} | Page ${currentPage + 1}/${pages.length}` });
      
      const message = await interaction.editReply({
        embeds: [embed],
        components: [
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 1,
                label: 'Previous',
                custom_id: 'prev',
                disabled: currentPage === 0
              },
              {
                type: 2,
                style: 1,
                label: 'Next',
                custom_id: 'next',
                disabled: currentPage === pages.length - 1
              }
            ]
          }
        ]
      });
      
      // Set up a collector for the pagination buttons
      const filter = i => i.user.id === interaction.user.id && ['prev', 'next'].includes(i.customId);
      
      const collector = message.createMessageComponentCollector({
        filter,
        time: 60000 // 1 minute
      });
      
      collector.on('collect', async i => {
        // Update current page
        if (i.customId === 'prev') {
          currentPage = Math.max(0, currentPage - 1);
        } else if (i.customId === 'next') {
          currentPage = Math.min(pages.length - 1, currentPage + 1);
        }
        
        // Update the embed
        const updatedEmbed = pages[currentPage]
          .setFooter({ text: `ID: ${reactionRoles[currentPage].messageID} | Page ${currentPage + 1}/${pages.length}` });
        
        // Update the message
        await i.update({
          embeds: [updatedEmbed],
          components: [
            {
              type: 1,
              components: [
                {
                  type: 2,
                  style: 1,
                  label: 'Previous',
                  custom_id: 'prev',
                  disabled: currentPage === 0
                },
                {
                  type: 2,
                  style: 1,
                  label: 'Next',
                  custom_id: 'next',
                  disabled: currentPage === pages.length - 1
                }
              ]
            }
          ]
        });
      });
      
      collector.on('end', async () => {
        // Remove the buttons when the collector ends
        const finalEmbed = pages[currentPage]
          .setFooter({ text: `ID: ${reactionRoles[currentPage].messageID} | Page ${currentPage + 1}/${pages.length}` });
        
        await interaction.editReply({
          embeds: [finalEmbed],
          components: []
        }).catch(() => {
          // Ignore errors if the message is deleted
        });
      });
      
    } catch (error) {
      logger.error(`Error executing reactionrolelist command: ${error}`);
      
      if (interaction.deferred) {
        await interaction.editReply({ 
          content: 'There was an error fetching the reaction roles!', 
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
      // Check permissions
      if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
        return message.reply('You need the **Manage Roles** permission to use this command!');
      }
      
      // Send loading message
      const loadingMessage = await message.reply('Fetching reaction roles...');
      
      // Get all reaction roles for this guild
      const reactionRoles = await ReactionRole.find({ guildID: message.guildId });
      
      if (!reactionRoles.length) {
        return loadingMessage.edit('There are no reaction role messages set up in this server.');
      }
      
      // Create pages for each reaction role message
      const pages = [];
      
      for (const reactionRole of reactionRoles) {
        // Get the channel
        const channel = await message.guild.channels.fetch(reactionRole.channelID).catch(() => null);
        const channelName = channel ? `#${channel.name}` : 'Unknown channel';
        
        // Try to get the message
        let messageUrl = 'Unknown message';
        let messageContent = 'Message not found or inaccessible';
        
        if (channel) {
          try {
            const msg = await channel.messages.fetch(reactionRole.messageID);
            messageUrl = msg.url;
            messageContent = msg.embeds.length > 0 
              ? `**${msg.embeds[0].title || 'No title'}**\n${msg.embeds[0].description || 'No description'}`
              : msg.content || 'No content';
          } catch (err) {
            logger.warn(`Could not fetch message for reaction role: ${err}`);
          }
        }
        
        // Create role list
        const roleList = [];
        for (const reaction of reactionRole.reactions) {
          const role = await message.guild.roles.fetch(reaction.roleID).catch(() => null);
          const roleName = role ? role.name : 'Unknown role';
          const roleDescription = reaction.roleDescription ? ` - ${reaction.roleDescription}` : '';
          
          roleList.push(`${reaction.emoji} <@&${reaction.roleID}> (${roleName})${roleDescription}`);
        }
        
        // Create embed
        const embed = new EmbedBuilder()
          .setTitle('Reaction Role Information')
          .setDescription(`**Message Link:** [Click to view](${messageUrl})\n**Type:** ${reactionRole.type}\n**Channel:** ${channelName}\n\n**Preview:**\n${messageContent.substring(0, 200)}${messageContent.length > 200 ? '...' : ''}`)
          .setColor('#3498db')
          .addFields({
            name: 'Reactions',
            value: roleList.join('\n') || 'No reactions'
          })
          .setFooter({ text: `ID: ${reactionRole.messageID}` })
          .setTimestamp();
        
        pages.push(embed);
      }
      
      // If only one page, just send it
      if (pages.length === 1) {
        return loadingMessage.edit({ content: null, embeds: [pages[0]] });
      }
      
      // Otherwise, set up pagination
      let currentPage = 0;
      
      const embed = pages[currentPage]
        .setFooter({ text: `ID: ${reactionRoles[currentPage].messageID} | Page ${currentPage + 1}/${pages.length}` });
      
      const reply = await loadingMessage.edit({
        content: null,
        embeds: [embed],
        components: [
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 1,
                label: 'Previous',
                custom_id: 'prev',
                disabled: currentPage === 0
              },
              {
                type: 2,
                style: 1,
                label: 'Next',
                custom_id: 'next',
                disabled: currentPage === pages.length - 1
              }
            ]
          }
        ]
      });
      
      // Set up a collector for the pagination buttons
      const filter = i => i.user.id === message.author.id && ['prev', 'next'].includes(i.customId);
      
      const collector = reply.createMessageComponentCollector({
        filter,
        time: 60000 // 1 minute
      });
      
      collector.on('collect', async i => {
        // Update current page
        if (i.customId === 'prev') {
          currentPage = Math.max(0, currentPage - 1);
        } else if (i.customId === 'next') {
          currentPage = Math.min(pages.length - 1, currentPage + 1);
        }
        
        // Update the embed
        const updatedEmbed = pages[currentPage]
          .setFooter({ text: `ID: ${reactionRoles[currentPage].messageID} | Page ${currentPage + 1}/${pages.length}` });
        
        // Update the message
        await i.update({
          embeds: [updatedEmbed],
          components: [
            {
              type: 1,
              components: [
                {
                  type: 2,
                  style: 1,
                  label: 'Previous',
                  custom_id: 'prev',
                  disabled: currentPage === 0
                },
                {
                  type: 2,
                  style: 1,
                  label: 'Next',
                  custom_id: 'next',
                  disabled: currentPage === pages.length - 1
                }
              ]
            }
          ]
        });
      });
      
      collector.on('end', async () => {
        // Remove the buttons when the collector ends
        const finalEmbed = pages[currentPage]
          .setFooter({ text: `ID: ${reactionRoles[currentPage].messageID} | Page ${currentPage + 1}/${pages.length}` });
        
        await reply.edit({
          embeds: [finalEmbed],
          components: []
        }).catch(() => {
          // Ignore errors if the message is deleted
        });
      });
      
    } catch (error) {
      logger.error(`Error executing reactionrolelist command: ${error}`);
      message.reply('There was an error fetching the reaction roles!');
    }
  }
};