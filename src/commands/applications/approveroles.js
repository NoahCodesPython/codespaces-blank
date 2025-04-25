const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Application = require('../../models/application/Application');
const logger = require('../../utils/logger');

module.exports = {
  name: 'approveroles',
  description: 'Configure roles for approved applications',
  category: 'applications',
  aliases: ['approles', 'applicationroles', 'rolesconfig'],
  usage: '<add/remove/clear> [role]',
  examples: ['approveroles add @Member', 'approveroles remove @Applicant', 'approveroles clear add', 'approveroles clear all'],
  userPermissions: [PermissionFlagsBits.ManageGuild, PermissionFlagsBits.ManageRoles],
  botPermissions: [PermissionFlagsBits.ManageRoles],
  
  data: new SlashCommandBuilder()
    .setName('approveroles')
    .setDescription('Configure roles for approved applications')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Set role to add when application is approved')
        .addRoleOption(option => 
          option.setName('role')
            .setDescription('The role to add')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('removerole')
        .setDescription('Set role to remove when application is approved')
        .addRoleOption(option => 
          option.setName('role')
            .setDescription('The role to remove')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('clear')
        .setDescription('Clear role configuration')
        .addStringOption(option =>
          option.setName('type')
            .setDescription('Type of role to clear')
            .setRequired(true)
            .addChoices(
              { name: 'Add Role', value: 'add' },
              { name: 'Remove Role', value: 'remove' },
              { name: 'Both Roles', value: 'all' }
            )))
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View current role configuration'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('dm')
        .setDescription('Toggle DM notifications for approvals/rejections')
        .addBooleanOption(option =>
          option.setName('enabled')
            .setDescription('Enable or disable DM notifications')
            .setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  
  // Slash command execution
  async execute(interaction) {
    try {
      // Get or create application config
      let applicationSettings = await Application.findOne({ guildID: interaction.guild.id });
      
      if (!applicationSettings) {
        applicationSettings = new Application({
          guildID: interaction.guild.id,
          questions: [],
          appToggle: false,
          appLogs: null
        });
      }
      
      const subcommand = interaction.options.getSubcommand();
      
      // Handle different subcommands
      if (subcommand === 'add') {
        const role = interaction.options.getRole('role');
        
        // Check if bot can manage this role
        if (role.managed) {
          return interaction.reply({
            content: 'I cannot assign integration roles like boosts or bot roles.',
            ephemeral: true
          });
        }
        
        if (role.position >= interaction.guild.members.me.roles.highest.position) {
          return interaction.reply({
            content: 'I cannot assign roles that are positioned higher than or equal to my highest role.',
            ephemeral: true
          });
        }
        
        // Update config
        applicationSettings.add_role = role.id;
        await applicationSettings.save();
        
        return interaction.reply({
          content: `Successfully set ${role} to be added when applications are approved.`,
          ephemeral: true
        });
      }
      
      else if (subcommand === 'removerole') {
        const role = interaction.options.getRole('role');
        
        // Check if bot can manage this role
        if (role.managed) {
          return interaction.reply({
            content: 'I cannot manage integration roles like boosts or bot roles.',
            ephemeral: true
          });
        }
        
        if (role.position >= interaction.guild.members.me.roles.highest.position) {
          return interaction.reply({
            content: 'I cannot manage roles that are positioned higher than or equal to my highest role.',
            ephemeral: true
          });
        }
        
        // Update config
        applicationSettings.remove_role = role.id;
        await applicationSettings.save();
        
        return interaction.reply({
          content: `Successfully set ${role} to be removed when applications are approved.`,
          ephemeral: true
        });
      }
      
      else if (subcommand === 'clear') {
        const type = interaction.options.getString('type');
        
        if (type === 'add') {
          applicationSettings.add_role = null;
          await applicationSettings.save();
          return interaction.reply({
            content: 'Successfully cleared the role to add setting.',
            ephemeral: true
          });
        }
        else if (type === 'remove') {
          applicationSettings.remove_role = null;
          await applicationSettings.save();
          return interaction.reply({
            content: 'Successfully cleared the role to remove setting.',
            ephemeral: true
          });
        }
        else if (type === 'all') {
          applicationSettings.add_role = null;
          applicationSettings.remove_role = null;
          await applicationSettings.save();
          return interaction.reply({
            content: 'Successfully cleared all role settings.',
            ephemeral: true
          });
        }
      }
      
      else if (subcommand === 'view') {
        // Create response embed
        const embed = new EmbedBuilder()
          .setTitle('Application Role Configuration')
          .setColor('#3498db')
          .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) })
          .setTimestamp();
        
        // Add role information
        const addRole = applicationSettings.add_role ? 
          interaction.guild.roles.cache.get(applicationSettings.add_role) : null;
        
        const removeRole = applicationSettings.remove_role ? 
          interaction.guild.roles.cache.get(applicationSettings.remove_role) : null;
        
        embed.addFields({ 
          name: 'Role to Add', 
          value: addRole ? `${addRole} (${addRole.id})` : 'None configured' 
        });
        
        embed.addFields({ 
          name: 'Role to Remove', 
          value: removeRole ? `${removeRole} (${removeRole.id})` : 'None configured' 
        });
        
        embed.addFields({ 
          name: 'DM Notifications', 
          value: applicationSettings.dm ? 'Enabled ✅' : 'Disabled ❌'
        });
        
        return interaction.reply({ embeds: [embed] });
      }
      
      else if (subcommand === 'dm') {
        const enabled = interaction.options.getBoolean('enabled');
        
        // Update config
        applicationSettings.dm = enabled;
        await applicationSettings.save();
        
        return interaction.reply({
          content: `Successfully ${enabled ? 'enabled' : 'disabled'} DM notifications for application approvals/rejections.`,
          ephemeral: true
        });
      }
      
    } catch (error) {
      logger.error(`Error executing approveroles command: ${error}`);
      await interaction.reply({ 
        content: 'There was an error executing this command!', 
        ephemeral: true 
      });
    }
  },
  
  // Legacy command execution
  async run(client, message, args) {
    try {
      // Get or create application config
      let applicationSettings = await Application.findOne({ guildID: message.guild.id });
      
      if (!applicationSettings) {
        applicationSettings = new Application({
          guildID: message.guild.id,
          questions: [],
          appToggle: false,
          appLogs: null
        });
      }
      
      // Check if sufficient args were provided
      if (!args.length) {
        // Display current configuration
        const embed = new EmbedBuilder()
          .setTitle('Application Role Configuration')
          .setColor('#3498db')
          .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) })
          .setTimestamp();
        
        // Add role information
        const addRole = applicationSettings.add_role ? 
          message.guild.roles.cache.get(applicationSettings.add_role) : null;
        
        const removeRole = applicationSettings.remove_role ? 
          message.guild.roles.cache.get(applicationSettings.remove_role) : null;
        
        embed.addFields({ 
          name: 'Role to Add', 
          value: addRole ? `${addRole} (${addRole.id})` : 'None configured' 
        });
        
        embed.addFields({ 
          name: 'Role to Remove', 
          value: removeRole ? `${removeRole} (${removeRole.id})` : 'None configured' 
        });
        
        embed.addFields({ 
          name: 'DM Notifications', 
          value: applicationSettings.dm ? 'Enabled ✅' : 'Disabled ❌'
        });
        
        embed.addFields({ 
          name: 'Usage', 
          value: '`approveroles add @Role` - Set role to add when approved\n`approveroles remove @Role` - Set role to remove when approved\n`approveroles clear add/remove/all` - Clear role settings\n`approveroles dm on/off` - Toggle DM notifications' 
        });
        
        return message.reply({ embeds: [embed] });
      }
      
      const action = args[0].toLowerCase();
      
      if (action === 'add') {
        // Get mentioned role
        const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
        
        if (!role) {
          return message.reply('Please mention a valid role or provide a valid role ID.');
        }
        
        // Check if bot can manage this role
        if (role.managed) {
          return message.reply('I cannot assign integration roles like boosts or bot roles.');
        }
        
        if (role.position >= message.guild.members.me.roles.highest.position) {
          return message.reply('I cannot assign roles that are positioned higher than or equal to my highest role.');
        }
        
        // Update config
        applicationSettings.add_role = role.id;
        await applicationSettings.save();
        
        return message.reply(`Successfully set ${role} to be added when applications are approved.`);
      }
      
      else if (action === 'remove') {
        // Get mentioned role
        const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
        
        if (!role) {
          return message.reply('Please mention a valid role or provide a valid role ID.');
        }
        
        // Check if bot can manage this role
        if (role.managed) {
          return message.reply('I cannot manage integration roles like boosts or bot roles.');
        }
        
        if (role.position >= message.guild.members.me.roles.highest.position) {
          return message.reply('I cannot manage roles that are positioned higher than or equal to my highest role.');
        }
        
        // Update config
        applicationSettings.remove_role = role.id;
        await applicationSettings.save();
        
        return message.reply(`Successfully set ${role} to be removed when applications are approved.`);
      }
      
      else if (action === 'clear') {
        if (!args[1]) {
          return message.reply('Please specify what to clear: `add`, `remove`, or `all`.');
        }
        
        const type = args[1].toLowerCase();
        
        if (type === 'add') {
          applicationSettings.add_role = null;
          await applicationSettings.save();
          return message.reply('Successfully cleared the role to add setting.');
        }
        else if (type === 'remove') {
          applicationSettings.remove_role = null;
          await applicationSettings.save();
          return message.reply('Successfully cleared the role to remove setting.');
        }
        else if (type === 'all') {
          applicationSettings.add_role = null;
          applicationSettings.remove_role = null;
          await applicationSettings.save();
          return message.reply('Successfully cleared all role settings.');
        }
        else {
          return message.reply('Invalid option. Please use `add`, `remove`, or `all`.');
        }
      }
      
      else if (action === 'dm') {
        if (!args[1]) {
          return message.reply('Please specify whether to enable or disable DM notifications: `on` or `off`.');
        }
        
        const option = args[1].toLowerCase();
        
        if (option === 'on' || option === 'true' || option === 'enable') {
          applicationSettings.dm = true;
          await applicationSettings.save();
          return message.reply('Successfully enabled DM notifications for application approvals/rejections.');
        }
        else if (option === 'off' || option === 'false' || option === 'disable') {
          applicationSettings.dm = false;
          await applicationSettings.save();
          return message.reply('Successfully disabled DM notifications for application approvals/rejections.');
        }
        else {
          return message.reply('Invalid option. Please use `on` or `off`.');
        }
      }
      
      else {
        return message.reply('Invalid action. Use `add`, `remove`, `clear`, or `dm`.');
      }
      
    } catch (error) {
      logger.error(`Error executing approveroles command: ${error}`);
      message.reply('There was an error executing this command!');
    }
  }
};