const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../../utils/logger');
const { isOwner } = require('../../utils/ownerCheck');
const Guild = require('../../models/Guild');

// We're going to store the maintenance mode status in memory
// And also allow storing a message to display
if (!global.maintenanceMode) {
  global.maintenanceMode = {
    enabled: false,
    message: 'The bot is currently in maintenance mode. Please try again later.',
    allowedCommands: ['help', 'ping', 'maintenance'] // Commands that will still work in maintenance mode
  };
}

module.exports = {
  name: 'maintenance',
  description: 'Toggle maintenance mode for the bot',
  category: 'owner',
  usage: '[on/off] [message]',
  examples: ['maintenance on Server updates in progress', 'maintenance off'],
  
  data: new SlashCommandBuilder()
    .setName('maintenance')
    .setDescription('Toggle maintenance mode for the bot')
    .addSubcommand(subcommand =>
      subcommand
        .setName('on')
        .setDescription('Enable maintenance mode')
        .addStringOption(option =>
          option
            .setName('message')
            .setDescription('Maintenance message to display')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('off')
        .setDescription('Disable maintenance mode')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('Check maintenance mode status')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  async execute(interaction) {
    try {
      // Check if user is a bot owner
      const isUserOwner = await isOwner(interaction.user.id);
      
      if (!isUserOwner) {
        return interaction.reply({
          content: 'Only bot owners can use this command.',
          ephemeral: true
        });
      }
      
      const subcommand = interaction.options.getSubcommand();
      
      // Handle status check
      if (subcommand === 'status') {
        const embed = new EmbedBuilder()
          .setTitle('Maintenance Mode Status')
          .setColor(global.maintenanceMode.enabled ? '#FF0000' : '#00FF00')
          .setDescription(`Maintenance mode is currently **${global.maintenanceMode.enabled ? 'ENABLED' : 'DISABLED'}**`)
          .addFields(
            { name: 'Message', value: global.maintenanceMode.message || 'No message set' }
          )
          .setFooter({ text: 'Aquire Bot Maintenance' })
          .setTimestamp();
        
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
      
      // Handle enable/disable
      if (subcommand === 'on') {
        const message = interaction.options.getString('message');
        
        global.maintenanceMode.enabled = true;
        if (message) {
          global.maintenanceMode.message = message;
        }
        
        const embed = new EmbedBuilder()
          .setTitle('Maintenance Mode Enabled')
          .setColor('#FF0000')
          .setDescription(`Maintenance mode has been **ENABLED**.`)
          .addFields(
            { name: 'Message', value: global.maintenanceMode.message }
          )
          .setFooter({ text: 'Aquire Bot Maintenance' })
          .setTimestamp();
        
        logger.warn(`Maintenance mode enabled by ${interaction.user.tag} (${interaction.user.id})`);
        return interaction.reply({ embeds: [embed] });
      }
      
      if (subcommand === 'off') {
        global.maintenanceMode.enabled = false;
        
        const embed = new EmbedBuilder()
          .setTitle('Maintenance Mode Disabled')
          .setColor('#00FF00')
          .setDescription(`Maintenance mode has been **DISABLED**.`)
          .setFooter({ text: 'Aquire Bot Maintenance' })
          .setTimestamp();
        
        logger.info(`Maintenance mode disabled by ${interaction.user.tag} (${interaction.user.id})`);
        return interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      logger.error(`Error executing maintenance command: ${error}`);
      await interaction.reply({ 
        content: 'There was an error while executing this command!', 
        ephemeral: true 
      });
    }
  }
};