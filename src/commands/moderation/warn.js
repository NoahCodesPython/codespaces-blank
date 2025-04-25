const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Guild = require('../../models/Guild');
const User = require('../../models/User');

module.exports = {
  name: 'warn',
  description: 'Warn a member in the server',
  usage: 'warn <user> [reason]',
  category: 'moderation',
  cooldown: 5,
  aliases: ['warning'],
  permissions: [PermissionFlagsBits.ModerateMembers],
  
  // Slash command data
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Manage warnings for a user')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a warning to a user')
        .addUserOption(option => 
          option.setName('user')
            .setDescription('The user to warn')
            .setRequired(true))
        .addStringOption(option => 
          option.setName('reason')
            .setDescription('The reason for the warning')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('removewarning')
        .setDescription('Remove a warning from a user')
        .addUserOption(option => 
          option.setName('user')
            .setDescription('The user to remove warning from')
            .setRequired(true))
        .addIntegerOption(option => 
          option.setName('warning_id')
            .setDescription('The ID of the warning to remove')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all warnings for a user')
        .addUserOption(option => 
          option.setName('user')
            .setDescription('The user to check warnings for')
            .setRequired(true))),
  
  // Execute slash command
  async execute(client, interaction) {
    await interaction.deferReply();
    
    const subcommand = interaction.options.getSubcommand();
    const targetUser = interaction.options.getUser('user');
    
    if (subcommand === 'add') {
      const reason = interaction.options.getString('reason') || 'No reason provided';
      
      // Add warning
      const userWarning = await addWarning(client, interaction.guild.id, targetUser.id, interaction.user.id, reason);
      
      // Send success message
      const embed = new EmbedBuilder()
        .setColor('#f39c12')
        .setTitle('User Warned')
        .setDescription(`**${targetUser.tag}** has been warned.`)
        .addFields(
          { name: 'Reason', value: reason },
          { name: 'Warning ID', value: userWarning.warningId.toString() },
          { name: 'Warned by', value: interaction.user.tag }
        )
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      
      // Log to moderation channel if enabled
      await logModAction(client, interaction.guild.id, {
        type: 'warn',
        user: targetUser,
        moderator: interaction.user,
        reason,
        warningId: userWarning.warningId
      });
      
    } else if (subcommand === 'removewarning') {
      const warningId = interaction.options.getInteger('warning_id');
      
      // Remove warning
      const result = await removeWarning(client, targetUser.id, warningId);
      
      if (result.success) {
        // Send success message
        const embed = new EmbedBuilder()
          .setColor('#2ecc71')
          .setTitle('Warning Removed')
          .setDescription(`Warning **#${warningId}** has been removed from **${targetUser.tag}**.`)
          .addFields(
            { name: 'Removed by', value: interaction.user.tag }
          )
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.editReply(result.message);
      }
      
    } else if (subcommand === 'list') {
      // Get user warnings
      const userWarnings = await getUserWarnings(targetUser.id);
      
      if (userWarnings.length === 0) {
        return interaction.editReply(`**${targetUser.tag}** has no warnings.`);
      }
      
      // Create embed with warnings
      const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle(`Warnings for ${targetUser.tag}`)
        .setDescription(
          userWarnings.map(warning => 
            `**ID: ${warning.id}** - ${warning.reason}\n` +
            `Warned by <@${warning.moderatorId}> on ${new Date(warning.timestamp).toLocaleString()}`
          ).join('\n\n')
        )
        .setFooter({ text: `Total Warnings: ${userWarnings.length}` })
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
    }
  },
  
  // Execute prefix command
  async run(client, message, args) {
    // Check for arguments
    if (!args[0]) {
      return message.reply(`Please provide a subcommand (add, remove, list). Usage: \`${client.config.prefix}${this.usage}\``);
    }
    
    const subcommand = args[0].toLowerCase();
    
    if (!['add', 'remove', 'list'].includes(subcommand)) {
      return message.reply(`Invalid subcommand. Please use add, remove, or list. Usage: \`${client.config.prefix}${this.usage}\``);
    }
    
    // Get target user
    const targetUser = message.mentions.users.first() || await client.users.fetch(args[1]).catch(() => null);
    
    if (!targetUser) {
      return message.reply('Please provide a valid user mention or ID.');
    }
    
    if (subcommand === 'add') {
      const reason = args.slice(2).join(' ') || 'No reason provided';
      
      // Add warning
      const userWarning = await addWarning(client, message.guild.id, targetUser.id, message.author.id, reason);
      
      // Send success message
      const embed = new EmbedBuilder()
        .setColor('#f39c12')
        .setTitle('User Warned')
        .setDescription(`**${targetUser.tag}** has been warned.`)
        .addFields(
          { name: 'Reason', value: reason },
          { name: 'Warning ID', value: userWarning.warningId.toString() },
          { name: 'Warned by', value: message.author.tag }
        )
        .setTimestamp();
      
      await message.channel.send({ embeds: [embed] });
      
      // Log to moderation channel if enabled
      await logModAction(client, message.guild.id, {
        type: 'warn',
        user: targetUser,
        moderator: message.author,
        reason,
        warningId: userWarning.warningId
      });
      
    } else if (subcommand === 'remove') {
      const warningId = parseInt(args[2]);
      
      if (!warningId || isNaN(warningId)) {
        return message.reply('Please provide a valid warning ID to remove.');
      }
      
      // Remove warning
      const result = await removeWarning(client, targetUser.id, warningId);
      
      if (result.success) {
        // Send success message
        const embed = new EmbedBuilder()
          .setColor('#2ecc71')
          .setTitle('Warning Removed')
          .setDescription(`Warning **#${warningId}** has been removed from **${targetUser.tag}**.`)
          .addFields(
            { name: 'Removed by', value: message.author.tag }
          )
          .setTimestamp();
        
        await message.channel.send({ embeds: [embed] });
      } else {
        await message.reply(result.message);
      }
      
    } else if (subcommand === 'list') {
      // Get user warnings
      const userWarnings = await getUserWarnings(targetUser.id);
      
      if (userWarnings.length === 0) {
        return message.reply(`**${targetUser.tag}** has no warnings.`);
      }
      
      // Create embed with warnings
      const embed = new EmbedBuilder()
        .setColor('#3498db')
        .setTitle(`Warnings for ${targetUser.tag}`)
        .setDescription(
          userWarnings.map(warning => 
            `**ID: ${warning.id}** - ${warning.reason}\n` +
            `Warned by <@${warning.moderatorId}> on ${new Date(warning.timestamp).toLocaleString()}`
          ).join('\n\n')
        )
        .setFooter({ text: `Total Warnings: ${userWarnings.length}` })
        .setTimestamp();
      
      await message.channel.send({ embeds: [embed] });
    }
  }
};

/**
 * Add a warning to a user
 */
async function addWarning(client, guildId, userId, moderatorId, reason) {
  try {
    // Get or create user document
    let userDoc = await User.findOne({ userID: userId });
    
    if (!userDoc) {
      userDoc = new User({ userID: userId });
    }
    
    // Create warning object
    const warningId = userDoc.warnings.length + 1;
    const warning = {
      id: warningId,
      guildId: guildId,
      moderatorId: moderatorId,
      reason: reason,
      timestamp: new Date()
    };
    
    // Add warning to array
    userDoc.warnings.push(warning);
    
    // Save document
    await userDoc.save();
    
    return { success: true, warningId: warningId };
  } catch (error) {
    client.logger.error(`Error adding warning: ${error}`);
    return { success: false, message: 'An error occurred while adding the warning.' };
  }
}

/**
 * Remove a warning from a user
 */
async function removeWarning(client, userId, warningId) {
  try {
    // Get user document
    const userDoc = await User.findOne({ userID: userId });
    
    if (!userDoc) {
      return { success: false, message: 'This user has no warnings.' };
    }
    
    // Find warning index
    const warningIndex = userDoc.warnings.findIndex(w => w.id === warningId);
    
    if (warningIndex === -1) {
      return { success: false, message: `Warning with ID ${warningId} not found.` };
    }
    
    // Remove warning
    userDoc.warnings.splice(warningIndex, 1);
    
    // Update warning IDs to ensure they remain sequential
    userDoc.warnings.forEach((warning, index) => {
      warning.id = index + 1;
    });
    
    // Save document
    await userDoc.save();
    
    return { success: true };
  } catch (error) {
    client.logger.error(`Error removing warning: ${error}`);
    return { success: false, message: 'An error occurred while removing the warning.' };
  }
}

/**
 * Get all warnings for a user
 */
async function getUserWarnings(userId) {
  try {
    // Get user document
    const userDoc = await User.findOne({ userID: userId });
    
    if (!userDoc || !userDoc.warnings) {
      return [];
    }
    
    return userDoc.warnings;
  } catch (error) {
    return [];
  }
}

/**
 * Log moderation action to the guild's mod log channel
 */
async function logModAction(client, guildId, action) {
  try {
    // Get guild settings
    const guildSettings = await Guild.findOne({ guildID: guildId });
    
    // Check if mod logs are enabled
    if (!guildSettings || !guildSettings.modLogEnabled || !guildSettings.modLogChannel) {
      return;
    }
    
    // Get the channel
    const logChannel = await client.channels.fetch(guildSettings.modLogChannel).catch(() => null);
    
    if (!logChannel) {
      return;
    }
    
    // Create embed based on action type
    const embed = new EmbedBuilder()
      .setColor('#f39c12')
      .setTitle(`Member ${action.type.charAt(0).toUpperCase() + action.type.slice(1)}ed`)
      .addFields(
        { name: 'User', value: `${action.user.tag} (${action.user.id})` },
        { name: 'Moderator', value: `${action.moderator.tag} (${action.moderator.id})` },
        { name: 'Reason', value: action.reason }
      )
      .setTimestamp();
    
    // Add warning ID if applicable
    if (action.warningId) {
      embed.addFields({ name: 'Warning ID', value: action.warningId.toString() });
    }
    
    // Send the log
    await logChannel.send({ embeds: [embed] });
  } catch (error) {
    client.logger.error(`Error logging mod action: ${error}`);
  }
}
