const { SlashCommandBuilder, EmbedBuilder, UserFlags } = require('discord.js');
const moment = require('moment');

// Constants for user flags/badges
const FLAGS = {
  Staff: 'Discord Employee',
  Partner: 'Discord Partner',
  Hypesquad: 'HypeSquad Events',
  BugHunterLevel1: 'Bug Hunter (Level 1)',
  BugHunterLevel2: 'Bug Hunter (Level 2)',
  HypeSquadOnlineHouse1: 'House of Bravery',
  HypeSquadOnlineHouse2: 'House of Brilliance',
  HypeSquadOnlineHouse3: 'House of Balance',
  PremiumEarlySupporter: 'Early Supporter',
  TeamPseudoUser: 'Team User',
  VerifiedBot: 'Verified Bot',
  VerifiedDeveloper: 'Early Verified Bot Developer'
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Displays information about a user')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to get information about')
        .setRequired(false)),
  
  category: 'information',
  usage: '/userinfo [user]',
  examples: ['/userinfo', '/userinfo @username'],
  aliases: ['ui', 'user', 'whois'],
  
  /**
   * Execute the command - Slash Command
   * @param {*} interaction - The interaction object
   */
  async execute(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    
    if (!member) {
      return interaction.reply({ 
        content: 'Error: I couldn\'t find that user in this server.', 
        ephemeral: true 
      });
    }
    
    // Format dates
    const createdAt = moment(targetUser.createdAt).format('MMMM Do YYYY, h:mm:ss a');
    const joinedAt = moment(member.joinedAt).format('MMMM Do YYYY, h:mm:ss a');
    
    // Get user flags
    const userFlags = targetUser.flags ? targetUser.flags.toArray() : [];
    const flagsText = userFlags.length ? 
      userFlags.map(flag => `\`${FLAGS[flag]}\``).join('\n') : 
      '`None`';
    
    // Get roles
    const roles = member.roles.cache
      .sort((a, b) => b.position - a.position)
      .map(role => role)
      .filter(role => role.name !== '@everyone');
    
    const rolesText = roles.length ? 
      roles.slice(0, 10).join(' ') + (roles.length > 10 ? ` and ${roles.length - 10} more roles` : '') : 
      '`None`';
    
    // Get user status and activity
    const status = member.presence ? member.presence.status : 'offline';
    const activity = member.presence && member.presence.activities.length ? 
      member.presence.activities[0] : null;
    
    let activityText = 'None';
    if (activity) {
      switch (activity.type) {
        case 0: activityText = `Playing **${activity.name}**`; break;
        case 1: activityText = `Streaming **${activity.name}**`; break;
        case 2: activityText = `Listening to **${activity.name}**`; break;
        case 3: activityText = `Watching **${activity.name}**`; break;
        case 4: activityText = activity.state ? `Custom Status: ${activity.state}` : 'Custom Status'; break;
        case 5: activityText = `Competing in **${activity.name}**`; break;
      }
    }
    
    const embed = new EmbedBuilder()
      .setAuthor({ name: targetUser.tag, iconURL: targetUser.displayAvatarURL({ dynamic: true }) })
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .setColor(member.displayHexColor === '#000000' ? '#FFFFFF' : member.displayHexColor)
      .addFields(
        { name: 'User Information', value: [
          `**• Username:** \`${targetUser.username}\``,
          `**• Discriminator:** \`#${targetUser.discriminator}\``,
          `**• ID:** \`${targetUser.id}\``,
          `**• Joined Discord:** \`${createdAt}\``,
          `**• Joined Server:** \`${joinedAt}\``,
          `**• Status:** \`${status}\``,
          activity ? `**• Activity:** ${activityText}` : '',
        ].filter(Boolean).join('\n'), inline: false },
        { name: `Roles [${roles.length}]`, value: rolesText, inline: false },
        { name: 'Badges', value: flagsText, inline: false }
      )
      .setFooter({ text: `ID: ${targetUser.id}` })
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
    let targetUser;
    let member;
    
    if (message.mentions.members.size > 0) {
      member = message.mentions.members.first();
      targetUser = member.user;
    } else if (args[0]) {
      try {
        member = await message.guild.members.fetch(args[0]);
        targetUser = member.user;
      } catch (error) {
        member = message.member;
        targetUser = message.author;
      }
    } else {
      member = message.member;
      targetUser = message.author;
    }
    
    // Format dates
    const createdAt = moment(targetUser.createdAt).format('MMMM Do YYYY, h:mm:ss a');
    const joinedAt = moment(member.joinedAt).format('MMMM Do YYYY, h:mm:ss a');
    
    // Get user flags
    const userFlags = targetUser.flags ? targetUser.flags.toArray() : [];
    const flagsText = userFlags.length ? 
      userFlags.map(flag => `\`${FLAGS[flag]}\``).join('\n') : 
      '`None`';
    
    // Get roles
    const roles = member.roles.cache
      .sort((a, b) => b.position - a.position)
      .map(role => role)
      .filter(role => role.name !== '@everyone');
    
    const rolesText = roles.length ? 
      roles.slice(0, 10).join(' ') + (roles.length > 10 ? ` and ${roles.length - 10} more roles` : '') : 
      '`None`';
    
    // Get user status and activity
    const status = member.presence ? member.presence.status : 'offline';
    const activity = member.presence && member.presence.activities.length ? 
      member.presence.activities[0] : null;
    
    let activityText = 'None';
    if (activity) {
      switch (activity.type) {
        case 0: activityText = `Playing **${activity.name}**`; break;
        case 1: activityText = `Streaming **${activity.name}**`; break;
        case 2: activityText = `Listening to **${activity.name}**`; break;
        case 3: activityText = `Watching **${activity.name}**`; break;
        case 4: activityText = activity.state ? `Custom Status: ${activity.state}` : 'Custom Status'; break;
        case 5: activityText = `Competing in **${activity.name}**`; break;
      }
    }
    
    const embed = new EmbedBuilder()
      .setAuthor({ name: targetUser.tag, iconURL: targetUser.displayAvatarURL({ dynamic: true }) })
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .setColor(member.displayHexColor === '#000000' ? '#FFFFFF' : member.displayHexColor)
      .addFields(
        { name: 'User Information', value: [
          `**• Username:** \`${targetUser.username}\``,
          `**• Discriminator:** \`#${targetUser.discriminator}\``,
          `**• ID:** \`${targetUser.id}\``,
          `**• Joined Discord:** \`${createdAt}\``,
          `**• Joined Server:** \`${joinedAt}\``,
          `**• Status:** \`${status}\``,
          activity ? `**• Activity:** ${activityText}` : '',
        ].filter(Boolean).join('\n'), inline: false },
        { name: `Roles [${roles.length}]`, value: rolesText, inline: false },
        { name: 'Badges', value: flagsText, inline: false }
      )
      .setFooter({ text: `ID: ${targetUser.id}` })
      .setTimestamp();
    
    await message.channel.send({ embeds: [embed] });
  }
};