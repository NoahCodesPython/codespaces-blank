const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const TicketSettings = require('../../models/ticket/TicketSettings');
const logger = require('../../utils/logger');

module.exports = {
  name: 'addsupporter',
  description: 'Add a user as a ticket supporter',
  category: 'ticket',
  aliases: ['ticketaddsupporter', 'addticketstaff'],
  usage: '<user>',
  examples: ['addsupporter @SupportStaff'],
  userPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('addsupporter')
    .setDescription('Add a user as a ticket supporter')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to add as a ticket supporter')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  // Slash command execution
  async execute(interaction) {
    try {
      // Defer reply
      await interaction.deferReply();
      
      const user = interaction.options.getUser('user');
      const guildID = interaction.guild.id;
      
      // Get ticket settings
      let settings = await TicketSettings.findOne({ guildID });
      
      if (!settings) {
        return interaction.editReply('The ticket system is not set up for this server. Please use `/ticketsetup` first.');
      }
      
      // Check if the user is already a supporter
      if (settings.ticketSupporters && settings.ticketSupporters.includes(user.id)) {
        return interaction.editReply(`${user.tag} is already a ticket supporter.`);
      }
      
      // Add the user to supporters
      if (!settings.ticketSupporters) {
        settings.ticketSupporters = [];
      }
      
      settings.ticketSupporters.push(user.id);
      await settings.save();
      
      // Create success embed
      const embed = new EmbedBuilder()
        .setTitle('Ticket Supporter Added')
        .setDescription(`${user.tag} has been added as a ticket supporter. They will now have access to all ticket channels.`)
        .setColor('#00FF00')
        .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error in addsupporter command: ${error}`);
      
      if (interaction.deferred) {
        await interaction.editReply({ 
          content: 'There was an error adding the ticket supporter.'
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
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply('You need Administrator permission to use this command.');
      }
      
      // Get mentioned user or user ID
      const user = message.mentions.users.first() || await client.users.fetch(args[0]).catch(() => null);
      
      if (!user) {
        return message.reply('Please mention a user or provide a valid user ID.');
      }
      
      const guildID = message.guild.id;
      
      // Get ticket settings
      let settings = await TicketSettings.findOne({ guildID });
      
      if (!settings) {
        return message.reply('The ticket system is not set up for this server. Please use the slash command `/ticketsetup` first.');
      }
      
      // Check if the user is already a supporter
      if (settings.ticketSupporters && settings.ticketSupporters.includes(user.id)) {
        return message.reply(`${user.tag} is already a ticket supporter.`);
      }
      
      // Add the user to supporters
      if (!settings.ticketSupporters) {
        settings.ticketSupporters = [];
      }
      
      settings.ticketSupporters.push(user.id);
      await settings.save();
      
      // Create success embed
      const embed = new EmbedBuilder()
        .setTitle('Ticket Supporter Added')
        .setDescription(`${user.tag} has been added as a ticket supporter. They will now have access to all ticket channels.`)
        .setColor('#00FF00')
        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      
      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error in legacy addsupporter command: ${error}`);
      message.reply('There was an error adding the ticket supporter.');
    }
  }
};