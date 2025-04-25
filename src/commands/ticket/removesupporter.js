const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const TicketSettings = require('../../models/ticket/TicketSettings');
const logger = require('../../utils/logger');

module.exports = {
  name: 'removesupporter',
  description: 'Remove a user from ticket supporters',
  category: 'ticket',
  aliases: ['ticketremovesupporter', 'removeticketstaff'],
  usage: '<user>',
  examples: ['removesupporter @SupportStaff'],
  userPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('removesupporter')
    .setDescription('Remove a user from ticket supporters')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to remove from ticket supporters')
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
      
      // Check if the user is not a supporter
      if (!settings.ticketSupporters || !settings.ticketSupporters.includes(user.id)) {
        return interaction.editReply(`${user.tag} is not a ticket supporter.`);
      }
      
      // Remove the user from supporters
      settings.ticketSupporters = settings.ticketSupporters.filter(id => id !== user.id);
      await settings.save();
      
      // Create success embed
      const embed = new EmbedBuilder()
        .setTitle('Ticket Supporter Removed')
        .setDescription(`${user.tag} has been removed from ticket supporters.`)
        .setColor('#FF9900')
        .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error in removesupporter command: ${error}`);
      
      if (interaction.deferred) {
        await interaction.editReply({ 
          content: 'There was an error removing the ticket supporter.'
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
      
      // Check if the user is not a supporter
      if (!settings.ticketSupporters || !settings.ticketSupporters.includes(user.id)) {
        return message.reply(`${user.tag} is not a ticket supporter.`);
      }
      
      // Remove the user from supporters
      settings.ticketSupporters = settings.ticketSupporters.filter(id => id !== user.id);
      await settings.save();
      
      // Create success embed
      const embed = new EmbedBuilder()
        .setTitle('Ticket Supporter Removed')
        .setDescription(`${user.tag} has been removed from ticket supporters.`)
        .setColor('#FF9900')
        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      
      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error in legacy removesupporter command: ${error}`);
      message.reply('There was an error removing the ticket supporter.');
    }
  }
};