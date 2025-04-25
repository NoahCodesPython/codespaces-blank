const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Suggestion = require('../../models/Suggestion');
const SuggestionSettings = require('../../models/SuggestionSettings');
const logger = require('../../utils/logger');

module.exports = {
  name: 'suggestmanage',
  description: 'Manage a suggestion (approve, reject, implement, etc.)',
  category: 'config',
  aliases: ['managesuggestion', 'suggestionmanage'],
  usage: '<id> <action> [reason]',
  examples: [
    'suggestmanage 5 approve Great idea!', 
    'suggestmanage 12 reject Not feasible at this time', 
    'suggestmanage 8 implement'
  ],
  userPermissions: [],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('suggestmanage')
    .setDescription('Manage a suggestion (approve, reject, implement, etc.)')
    .addIntegerOption(option =>
      option.setName('id')
        .setDescription('The ID of the suggestion to manage')
        .setRequired(true)
        .setMinValue(1))
    .addStringOption(option =>
      option.setName('action')
        .setDescription('The action to take on the suggestion')
        .setRequired(true)
        .addChoices(
          { name: 'Approve', value: 'approved' },
          { name: 'Reject', value: 'rejected' },
          { name: 'Implement', value: 'implemented' },
          { name: 'Consider', value: 'considered' }
        ))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('The reason for this decision')
        .setRequired(false)),
  
  // Slash command execution
  async execute(interaction) {
    try {
      const id = interaction.options.getInteger('id');
      const action = interaction.options.getString('action');
      const reason = interaction.options.getString('reason') || 'No reason provided';
      
      // Get server suggestion settings
      const settings = await SuggestionSettings.findOne({ guildID: interaction.guild.id });
      
      // Check if suggestions are enabled for this server
      if (!settings || !settings.enabled) {
        return interaction.reply({
          content: 'Suggestions are not enabled on this server.',
          ephemeral: true
        });
      }
      
      // Check permissions
      const hasPermission = interaction.member.permissions.has(PermissionFlagsBits.Administrator) || 
                          (settings.managerRole && interaction.member.roles.cache.has(settings.managerRole));
      
      if (!hasPermission) {
        return interaction.reply({
          content: 'You do not have permission to manage suggestions!',
          ephemeral: true
        });
      }
      
      // Find the suggestion
      const suggestion = await Suggestion.findOne({ 
        guildID: interaction.guild.id,
        suggestionID: id
      });
      
      if (!suggestion) {
        return interaction.reply({
          content: `Suggestion #${id} not found!`,
          ephemeral: true
        });
      }
      
      // Check if suggestion is already processed
      if (suggestion.status !== 'pending') {
        return interaction.reply({
          content: `Suggestion #${id} has already been ${suggestion.status}!`,
          ephemeral: true
        });
      }
      
      // Get the suggestion channel
      const channel = await interaction.guild.channels.fetch(suggestion.channelID).catch(() => null);
      
      if (!channel) {
        return interaction.reply({
          content: 'The suggestion channel could not be found!',
          ephemeral: true
        });
      }
      
      // Get the suggestion message
      const suggestionMessage = await channel.messages.fetch(suggestion.messageID).catch(() => null);
      
      if (!suggestionMessage) {
        return interaction.reply({
          content: 'The suggestion message could not be found!',
          ephemeral: true
        });
      }
      
      // Update suggestion in the database
      suggestion.status = action;
      suggestion.reason = reason;
      suggestion.dateResponded = new Date();
      suggestion.respondedBy = interaction.user.id;
      
      await suggestion.save();
      
      // Update the suggestion message
      const embed = EmbedBuilder.from(suggestionMessage.embeds[0]);
      
      // Update status field
      let statusText;
      let color;
      
      switch (action) {
        case 'approved':
          statusText = '✅ Approved';
          color = settings.colors.approved;
          break;
        case 'rejected':
          statusText = '❌ Rejected';
          color = settings.colors.rejected;
          break;
        case 'implemented':
          statusText = '🚀 Implemented';
          color = settings.colors.implemented;
          break;
        case 'considered':
          statusText = '⏳ Considering';
          color = settings.colors.considered;
          break;
      }
      
      embed.setColor(color);
      
      // Find the status field and update it
      const fields = embed.data.fields;
      for (let i = 0; i < fields.length; i++) {
        if (fields[i].name === 'Status') {
          fields[i].value = statusText;
        }
      }
      
      // Add reason field
      embed.addFields({ name: 'Reason', value: reason });
      
      // Add response info
      embed.addFields({ 
        name: 'Response', 
        value: `By <@${interaction.user.id}> on ${new Date().toLocaleString()}`
      });
      
      // Update the message
      await suggestionMessage.edit({ embeds: [embed], components: [] }); // Remove voting buttons
      
      // Send confirmation
      await interaction.reply({
        content: `Suggestion #${id} has been marked as ${action}!`,
        ephemeral: true
      });
      
      // DM the suggestion author if enabled
      if (settings.dmNotification) {
        try {
          const author = await interaction.client.users.fetch(suggestion.userID);
          
          if (author) {
            const dmEmbed = new EmbedBuilder()
              .setTitle(`Suggestion Update: #${id}`)
              .setDescription(`Your suggestion in **${interaction.guild.name}** has been ${action}!`)
              .setColor(color)
              .addFields(
                { name: 'Your Suggestion', value: suggestion.suggestion.length > 1024 ? suggestion.suggestion.substring(0, 1021) + '...' : suggestion.suggestion },
                { name: 'Reason', value: reason }
              )
              .setFooter({ text: `Responded by ${interaction.user.tag}` })
              .setTimestamp();
            
            await author.send({ embeds: [dmEmbed] }).catch(() => {
              // User might have DMs disabled - silently fail
              logger.debug(`Could not send DM to ${author.tag} for suggestion update`);
            });
          }
        } catch (error) {
          logger.error(`Error sending DM for suggestion update: ${error}`);
        }
      }
      
    } catch (error) {
      logger.error(`Error in suggestmanage command: ${error}`);
      await interaction.reply({
        content: 'There was an error managing the suggestion!',
        ephemeral: true
      });
    }
  },
  
  // Legacy command execution
  async run(client, message, args) {
    try {
      // Check if there are enough arguments
      if (args.length < 2) {
        return message.reply('Please provide an ID and an action! Usage: `!suggestmanage <id> <action> [reason]`');
      }
      
      const id = parseInt(args[0]);
      
      if (isNaN(id) || id < 1) {
        return message.reply('Please provide a valid suggestion ID!');
      }
      
      const action = args[1].toLowerCase();
      
      // Validate action
      if (!['approve', 'reject', 'implement', 'consider'].includes(action)) {
        return message.reply('Please provide a valid action: `approve`, `reject`, `implement`, or `consider`!');
      }
      
      // Convert action to database format
      const actionMap = {
        'approve': 'approved',
        'reject': 'rejected',
        'implement': 'implemented',
        'consider': 'considered'
      };
      
      const dbAction = actionMap[action];
      
      // Get reason (rest of the args)
      const reason = args.slice(2).join(' ') || 'No reason provided';
      
      // Get server suggestion settings
      const settings = await SuggestionSettings.findOne({ guildID: message.guild.id });
      
      // Check if suggestions are enabled for this server
      if (!settings || !settings.enabled) {
        return message.reply('Suggestions are not enabled on this server.');
      }
      
      // Check permissions
      const hasPermission = message.member.permissions.has(PermissionFlagsBits.Administrator) || 
                          (settings.managerRole && message.member.roles.cache.has(settings.managerRole));
      
      if (!hasPermission) {
        return message.reply('You do not have permission to manage suggestions!');
      }
      
      // Find the suggestion
      const suggestion = await Suggestion.findOne({ 
        guildID: message.guild.id,
        suggestionID: id
      });
      
      if (!suggestion) {
        return message.reply(`Suggestion #${id} not found!`);
      }
      
      // Check if suggestion is already processed
      if (suggestion.status !== 'pending') {
        return message.reply(`Suggestion #${id} has already been ${suggestion.status}!`);
      }
      
      // Get the suggestion channel
      const channel = await message.guild.channels.fetch(suggestion.channelID).catch(() => null);
      
      if (!channel) {
        return message.reply('The suggestion channel could not be found!');
      }
      
      // Get the suggestion message
      const suggestionMessage = await channel.messages.fetch(suggestion.messageID).catch(() => null);
      
      if (!suggestionMessage) {
        return message.reply('The suggestion message could not be found!');
      }
      
      // Update suggestion in the database
      suggestion.status = dbAction;
      suggestion.reason = reason;
      suggestion.dateResponded = new Date();
      suggestion.respondedBy = message.author.id;
      
      await suggestion.save();
      
      // Update the suggestion message
      const embed = EmbedBuilder.from(suggestionMessage.embeds[0]);
      
      // Update status field
      let statusText;
      let color;
      
      switch (dbAction) {
        case 'approved':
          statusText = '✅ Approved';
          color = settings.colors.approved;
          break;
        case 'rejected':
          statusText = '❌ Rejected';
          color = settings.colors.rejected;
          break;
        case 'implemented':
          statusText = '🚀 Implemented';
          color = settings.colors.implemented;
          break;
        case 'considered':
          statusText = '⏳ Considering';
          color = settings.colors.considered;
          break;
      }
      
      embed.setColor(color);
      
      // Find the status field and update it
      const fields = embed.data.fields;
      for (let i = 0; i < fields.length; i++) {
        if (fields[i].name === 'Status') {
          fields[i].value = statusText;
        }
      }
      
      // Add reason field
      embed.addFields({ name: 'Reason', value: reason });
      
      // Add response info
      embed.addFields({ 
        name: 'Response', 
        value: `By <@${message.author.id}> on ${new Date().toLocaleString()}`
      });
      
      // Update the message
      await suggestionMessage.edit({ embeds: [embed], components: [] }); // Remove voting buttons
      
      // Send confirmation
      await message.reply(`Suggestion #${id} has been marked as ${dbAction}!`);
      
      // DM the suggestion author if enabled
      if (settings.dmNotification) {
        try {
          const author = await client.users.fetch(suggestion.userID);
          
          if (author) {
            const dmEmbed = new EmbedBuilder()
              .setTitle(`Suggestion Update: #${id}`)
              .setDescription(`Your suggestion in **${message.guild.name}** has been ${dbAction}!`)
              .setColor(color)
              .addFields(
                { name: 'Your Suggestion', value: suggestion.suggestion.length > 1024 ? suggestion.suggestion.substring(0, 1021) + '...' : suggestion.suggestion },
                { name: 'Reason', value: reason }
              )
              .setFooter({ text: `Responded by ${message.author.tag}` })
              .setTimestamp();
            
            await author.send({ embeds: [dmEmbed] }).catch(() => {
              // User might have DMs disabled - silently fail
              logger.debug(`Could not send DM to ${author.tag} for suggestion update`);
            });
          }
        } catch (error) {
          logger.error(`Error sending DM for suggestion update: ${error}`);
        }
      }
      
    } catch (error) {
      logger.error(`Error in legacy suggestmanage command: ${error}`);
      message.reply('There was an error managing the suggestion!');
    }
  }
};