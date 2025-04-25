const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../../utils/logger');

module.exports = {
  name: 'userinfo',
  description: 'Display information about a user',
  category: 'information',
  aliases: ['user', 'whois', 'ui'],
  usage: '[user]',
  examples: ['userinfo', 'userinfo @User', 'userinfo 123456789012345678'],
  userPermissions: [],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Display information about a user')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to get information about')
        .setRequired(false)),
  
  // Slash command execution
  async execute(interaction) {
    try {
      // Get the target user, default to the command user if none specified
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const member = targetUser.id === interaction.user.id ? 
        interaction.member : 
        await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      
      // Create the embed
      const embed = new EmbedBuilder()
        .setTitle(`User Information - ${targetUser.tag}`)
        .setColor(member ? member.displayHexColor : '#3498db')
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
        .setFooter({ text: `User ID: ${targetUser.id}` })
        .setTimestamp();
      
      // Add general account info
      const createdTimestamp = Math.floor(targetUser.createdAt.getTime() / 1000);
      embed.addFields({ 
        name: 'Account Created', 
        value: `<t:${createdTimestamp}:F>\n(<t:${createdTimestamp}:R>)`, 
        inline: false 
      });
      
      // Add member-specific information if available
      if (member) {
        // Get join date
        const joinedTimestamp = Math.floor(member.joinedAt.getTime() / 1000);
        embed.addFields({ 
          name: 'Joined Server', 
          value: `<t:${joinedTimestamp}:F>\n(<t:${joinedTimestamp}:R>)`,
          inline: false 
        });
        
        // Get roles
        let roleString = member.roles.cache
          .filter(role => role.id !== interaction.guild.id) // Filter out @everyone
          .sort((a, b) => b.position - a.position) // Sort by position
          .map(role => `<@&${role.id}>`)
          .join(', ');
        
        if (!roleString) roleString = 'None';
        
        if (roleString.length > 1024) {
          roleString = roleString.substring(0, 1020) + '...';
        }
        
        embed.addFields({ 
          name: `Roles [${member.roles.cache.size - 1}]`, 
          value: roleString,
          inline: false 
        });
        
        // Check for acknowledgements/special permissions
        const acknowledgements = [];
        
        if (member.id === interaction.guild.ownerId) {
          acknowledgements.push('Server Owner');
        }
        
        if (member.permissions.has('Administrator')) {
          acknowledgements.push('Administrator');
        } else {
          if (member.permissions.has('ManageGuild')) acknowledgements.push('Manage Server');
          if (member.permissions.has('ManageRoles')) acknowledgements.push('Manage Roles');
          if (member.permissions.has('ManageChannels')) acknowledgements.push('Manage Channels');
          if (member.permissions.has('ModerateMembers')) acknowledgements.push('Timeout Members');
          if (member.permissions.has('BanMembers')) acknowledgements.push('Ban Members');
          if (member.permissions.has('KickMembers')) acknowledgements.push('Kick Members');
        }
        
        if (acknowledgements.length > 0) {
          embed.addFields({ 
            name: 'Acknowledgements', 
            value: acknowledgements.join(', '),
            inline: false 
          });
        }
      }
      
      // Add bot badge if the user is a bot
      if (targetUser.bot) {
        embed.setDescription('**Bot Account**');
      }
      
      // Send the embed
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing userinfo command: ${error}`);
      await interaction.reply({ 
        content: 'There was an error executing this command!', 
        ephemeral: true 
      });
    }
  },
  
  // Legacy command execution
  async run(client, message, args) {
    try {
      // Get the target user
      let targetUser;
      let member;
      
      // Check if a user was mentioned or ID provided
      if (!args.length) {
        targetUser = message.author;
        member = message.member;
      } else {
        // Try to get user from mention or ID
        const mention = message.mentions.users.first();
        if (mention) {
          targetUser = mention;
        } else {
          try {
            targetUser = await client.users.fetch(args[0]);
          } catch (error) {
            return message.reply('Could not find that user. Please provide a valid user mention or ID.');
          }
        }
        
        // Try to get member from guild
        member = await message.guild.members.fetch(targetUser.id).catch(() => null);
      }
      
      // Create the embed
      const embed = new EmbedBuilder()
        .setTitle(`User Information - ${targetUser.tag}`)
        .setColor(member ? member.displayHexColor : '#3498db')
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
        .setFooter({ text: `User ID: ${targetUser.id}` })
        .setTimestamp();
      
      // Add general account info
      const createdTimestamp = Math.floor(targetUser.createdAt.getTime() / 1000);
      embed.addFields({ 
        name: 'Account Created', 
        value: `<t:${createdTimestamp}:F>\n(<t:${createdTimestamp}:R>)`, 
        inline: false 
      });
      
      // Add member-specific information if available
      if (member) {
        // Get join date
        const joinedTimestamp = Math.floor(member.joinedAt.getTime() / 1000);
        embed.addFields({ 
          name: 'Joined Server', 
          value: `<t:${joinedTimestamp}:F>\n(<t:${joinedTimestamp}:R>)`,
          inline: false 
        });
        
        // Get roles
        let roleString = member.roles.cache
          .filter(role => role.id !== message.guild.id) // Filter out @everyone
          .sort((a, b) => b.position - a.position) // Sort by position
          .map(role => `<@&${role.id}>`)
          .join(', ');
        
        if (!roleString) roleString = 'None';
        
        if (roleString.length > 1024) {
          roleString = roleString.substring(0, 1020) + '...';
        }
        
        embed.addFields({ 
          name: `Roles [${member.roles.cache.size - 1}]`, 
          value: roleString,
          inline: false 
        });
        
        // Check for acknowledgements/special permissions
        const acknowledgements = [];
        
        if (member.id === message.guild.ownerId) {
          acknowledgements.push('Server Owner');
        }
        
        if (member.permissions.has('Administrator')) {
          acknowledgements.push('Administrator');
        } else {
          if (member.permissions.has('ManageGuild')) acknowledgements.push('Manage Server');
          if (member.permissions.has('ManageRoles')) acknowledgements.push('Manage Roles');
          if (member.permissions.has('ManageChannels')) acknowledgements.push('Manage Channels');
          if (member.permissions.has('ModerateMembers')) acknowledgements.push('Timeout Members');
          if (member.permissions.has('BanMembers')) acknowledgements.push('Ban Members');
          if (member.permissions.has('KickMembers')) acknowledgements.push('Kick Members');
        }
        
        if (acknowledgements.length > 0) {
          embed.addFields({ 
            name: 'Acknowledgements', 
            value: acknowledgements.join(', '),
            inline: false 
          });
        }
      }
      
      // Add bot badge if the user is a bot
      if (targetUser.bot) {
        embed.setDescription('**Bot Account**');
      }
      
      // Send the embed
      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing userinfo command: ${error}`);
      message.reply('There was an error executing this command!');
    }
  }
};