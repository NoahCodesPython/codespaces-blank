const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const logger = require('../../utils/logger');

module.exports = {
  name: 'permissions',
  description: 'Display the permissions for a user',
  category: 'information',
  aliases: ['perms', 'perm', 'userperms'],
  usage: '[user]',
  examples: ['permissions', 'permissions @User'],
  userPermissions: [],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('permissions')
    .setDescription('Display the permissions for a user')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to check permissions for')
        .setRequired(false)),
  
  // Slash command execution
  async execute(interaction) {
    try {
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const member = targetUser.id === interaction.user.id ? 
        interaction.member : 
        await interaction.guild.members.fetch(targetUser.id).catch(() => null);
      
      if (!member) {
        return interaction.reply({
          content: 'Could not find that user in this server.',
          ephemeral: true
        });
      }
      
      // Get user permissions
      const permissions = member.permissions;
      
      // Format permissions
      const formattedPerms = formatPermissions(permissions);
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle(`Permissions for ${member.user.tag}`)
        .setDescription(`Showing permissions for <@${member.id}> in ${interaction.guild.name}`)
        .setColor(member.displayHexColor || '#3498db')
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: `User ID: ${member.id}` })
        .setTimestamp();
      
      // Add permissions to embed
      const hasAdmin = permissions.has(PermissionsBitField.Flags.Administrator);
      if (hasAdmin) {
        embed.addFields({ name: 'Administrator', value: '✅ This user has Administrator permissions, which grants all permissions.' });
      }
      
      // Split permissions into groups for better display
      const generalPerms = formattedPerms.filter(p => ['Administrator', 'ManageGuild', 'ViewAuditLog', 'ChangeNickname', 'ManageNicknames'].includes(p.permission));
      const textPerms = formattedPerms.filter(p => ['SendMessages', 'ManageMessages', 'ManageThreads', 'CreatePublicThreads', 'CreatePrivateThreads', 'SendMessagesInThreads', 'ReadMessageHistory', 'AddReactions', 'UseExternalEmojis', 'UseExternalStickers', 'MentionEveryone', 'EmbedLinks', 'AttachFiles'].includes(p.permission));
      const voicePerms = formattedPerms.filter(p => ['Connect', 'Speak', 'StartEmbeddedActivities', 'Stream', 'UseVAD', 'PrioritySpeaker', 'MuteMembers', 'DeafenMembers', 'MoveMembers'].includes(p.permission));
      const modPerms = formattedPerms.filter(p => ['KickMembers', 'BanMembers', 'ModerateMembers'].includes(p.permission));
      const advancedPerms = formattedPerms.filter(p => ['ManageChannels', 'ManageRoles', 'ManageWebhooks', 'ManageEmojisAndStickers', 'ManageEvents', 'ManageGuildExpressions'].includes(p.permission));
      
      if (generalPerms.length > 0) {
        const generalText = generalPerms.map(p => `${p.has ? '✅' : '❌'} ${p.name}`).join('\n');
        embed.addFields({ name: 'General Permissions', value: generalText, inline: true });
      }
      
      if (modPerms.length > 0) {
        const modText = modPerms.map(p => `${p.has ? '✅' : '❌'} ${p.name}`).join('\n');
        embed.addFields({ name: 'Moderation Permissions', value: modText, inline: true });
      }
      
      if (textPerms.length > 0) {
        const textText = textPerms.map(p => `${p.has ? '✅' : '❌'} ${p.name}`).join('\n');
        embed.addFields({ name: 'Text Channel Permissions', value: textText, inline: true });
      }
      
      if (voicePerms.length > 0) {
        const voiceText = voicePerms.map(p => `${p.has ? '✅' : '❌'} ${p.name}`).join('\n');
        embed.addFields({ name: 'Voice Channel Permissions', value: voiceText, inline: true });
      }
      
      if (advancedPerms.length > 0) {
        const advancedText = advancedPerms.map(p => `${p.has ? '✅' : '❌'} ${p.name}`).join('\n');
        embed.addFields({ name: 'Advanced Permissions', value: advancedText, inline: true });
      }
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing permissions command: ${error}`);
      await interaction.reply({ 
        content: 'There was an error executing this command!', 
        ephemeral: true 
      });
    }
  },
  
  // Legacy command execution
  async run(client, message, args) {
    try {
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
      
      if (!member) {
        return message.reply('Could not find that user in this server.');
      }
      
      // Get user permissions
      const permissions = member.permissions;
      
      // Format permissions
      const formattedPerms = formatPermissions(permissions);
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle(`Permissions for ${member.user.tag}`)
        .setDescription(`Showing permissions for <@${member.id}> in ${message.guild.name}`)
        .setColor(member.displayHexColor || '#3498db')
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: `User ID: ${member.id}` })
        .setTimestamp();
      
      // Add permissions to embed
      const hasAdmin = permissions.has(PermissionsBitField.Flags.Administrator);
      if (hasAdmin) {
        embed.addFields({ name: 'Administrator', value: '✅ This user has Administrator permissions, which grants all permissions.' });
      }
      
      // Split permissions into groups for better display
      const generalPerms = formattedPerms.filter(p => ['Administrator', 'ManageGuild', 'ViewAuditLog', 'ChangeNickname', 'ManageNicknames'].includes(p.permission));
      const textPerms = formattedPerms.filter(p => ['SendMessages', 'ManageMessages', 'ManageThreads', 'CreatePublicThreads', 'CreatePrivateThreads', 'SendMessagesInThreads', 'ReadMessageHistory', 'AddReactions', 'UseExternalEmojis', 'UseExternalStickers', 'MentionEveryone', 'EmbedLinks', 'AttachFiles'].includes(p.permission));
      const voicePerms = formattedPerms.filter(p => ['Connect', 'Speak', 'StartEmbeddedActivities', 'Stream', 'UseVAD', 'PrioritySpeaker', 'MuteMembers', 'DeafenMembers', 'MoveMembers'].includes(p.permission));
      const modPerms = formattedPerms.filter(p => ['KickMembers', 'BanMembers', 'ModerateMembers'].includes(p.permission));
      const advancedPerms = formattedPerms.filter(p => ['ManageChannels', 'ManageRoles', 'ManageWebhooks', 'ManageEmojisAndStickers', 'ManageEvents', 'ManageGuildExpressions'].includes(p.permission));
      
      if (generalPerms.length > 0) {
        const generalText = generalPerms.map(p => `${p.has ? '✅' : '❌'} ${p.name}`).join('\n');
        embed.addFields({ name: 'General Permissions', value: generalText, inline: true });
      }
      
      if (modPerms.length > 0) {
        const modText = modPerms.map(p => `${p.has ? '✅' : '❌'} ${p.name}`).join('\n');
        embed.addFields({ name: 'Moderation Permissions', value: modText, inline: true });
      }
      
      if (textPerms.length > 0) {
        const textText = textPerms.map(p => `${p.has ? '✅' : '❌'} ${p.name}`).join('\n');
        embed.addFields({ name: 'Text Channel Permissions', value: textText, inline: true });
      }
      
      if (voicePerms.length > 0) {
        const voiceText = voicePerms.map(p => `${p.has ? '✅' : '❌'} ${p.name}`).join('\n');
        embed.addFields({ name: 'Voice Channel Permissions', value: voiceText, inline: true });
      }
      
      if (advancedPerms.length > 0) {
        const advancedText = advancedPerms.map(p => `${p.has ? '✅' : '❌'} ${p.name}`).join('\n');
        embed.addFields({ name: 'Advanced Permissions', value: advancedText, inline: true });
      }
      
      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing permissions command: ${error}`);
      message.reply('There was an error executing this command!');
    }
  }
};

// Helper function to format permissions
function formatPermissions(permissions) {
  const permissionFlags = Object.keys(PermissionsBitField.Flags);
  
  return permissionFlags
    .filter(flag => isNaN(Number(flag)))
    .map(flag => {
      const permissionName = formatPermissionName(flag);
      const has = permissions.has(PermissionsBitField.Flags[flag]);
      
      return {
        permission: flag,
        name: permissionName,
        has: has
      };
    });
}

// Helper function to format permission names
function formatPermissionName(permission) {
  const formatted = permission
    .replace(/([A-Z])/g, ' $1') // Add spaces between words
    .replace('VAD', 'Voice Activity Detection') // Expand acronyms
    .trim();
  
  return formatted;
}