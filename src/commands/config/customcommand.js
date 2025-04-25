const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const CustomCommand = require('../../models/CustomCommand');
const logger = require('../../utils/logger');

module.exports = {
  name: 'customcommand',
  description: 'Create a custom command for your server',
  category: 'config',
  aliases: ['cc', 'custom', 'addcmd'],
  usage: '<name> <response>',
  examples: ['customcommand hello Hello there!', 'customcommand serverinfo Check out our website at example.com'],
  userPermissions: [PermissionFlagsBits.ManageGuild],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('customcommand')
    .setDescription('Create a custom command for your server')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('The name of the custom command')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('response')
        .setDescription('The response for the custom command')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  
  // Slash command execution
  async execute(interaction) {
    try {
      // Get command info
      const name = interaction.options.getString('name').toLowerCase();
      const response = interaction.options.getString('response');
      
      // Validate command name
      if (name.length > 30) {
        return interaction.reply({ 
          content: 'Command name must be 30 characters or less!', 
          ephemeral: true 
        });
      }
      
      // Block creating commands that match built-in commands
      const isBuiltInCommand = interaction.client.slashCommands.has(name) || 
                               interaction.client.commands.has(name);
      
      if (isBuiltInCommand) {
        return interaction.reply({ 
          content: 'You cannot create a custom command with the same name as a built-in command!', 
          ephemeral: true 
        });
      }
      
      // Check if response is too long
      if (response.length > 2000) {
        return interaction.reply({ 
          content: 'Command response must be 2000 characters or less!', 
          ephemeral: true 
        });
      }
      
      // Check if command already exists
      const existingCommand = await CustomCommand.findOne({ 
        guildID: interaction.guild.id,
        name: name
      });
      
      if (existingCommand) {
        // Update existing command
        await CustomCommand.updateOne(
          { guildID: interaction.guild.id, name: name },
          { response: response, createdBy: interaction.user.id }
        );
        
        const embed = new EmbedBuilder()
          .setTitle('Custom Command Updated')
          .setDescription(`Command \`${name}\` has been updated.`)
          .addFields({ name: 'Response', value: response })
          .setColor('#0099ff')
          .setFooter({ 
            text: `Updated by ${interaction.user.tag}`,
            iconURL: interaction.user.displayAvatarURL({ dynamic: true })
          })
          .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
      } else {
        // Create new command
        const newCommand = new CustomCommand({
          guildID: interaction.guild.id,
          name: name,
          response: response,
          createdBy: interaction.user.id
        });
        
        await newCommand.save();
        
        const embed = new EmbedBuilder()
          .setTitle('Custom Command Created')
          .setDescription(`Command \`${name}\` has been created.`)
          .addFields({ name: 'Response', value: response })
          .setColor('#00ff00')
          .setFooter({ 
            text: `Created by ${interaction.user.tag}`,
            iconURL: interaction.user.displayAvatarURL({ dynamic: true })
          })
          .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
      }
      
    } catch (error) {
      logger.error(`Error in customcommand command: ${error}`);
      
      // Special error handling for duplicate key errors
      if (error.code === 11000) {
        return interaction.reply({ 
          content: 'A custom command with this name already exists!', 
          ephemeral: true 
        });
      }
      
      await interaction.reply({ 
        content: 'There was an error creating the custom command!', 
        ephemeral: true 
      });
    }
  },
  
  // Legacy command execution
  async run(client, message, args) {
    try {
      // Check for required permissions
      if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return message.reply('You need the **Manage Server** permission to use this command!');
      }
      
      // Check for missing arguments
      if (args.length < 2) {
        return message.reply('Please provide a command name and response! `!customcommand <name> <response>`');
      }
      
      const name = args[0].toLowerCase();
      const response = args.slice(1).join(' ');
      
      // Validate command name
      if (name.length > 30) {
        return message.reply('Command name must be 30 characters or less!');
      }
      
      // Block creating commands that match built-in commands
      const isBuiltInCommand = client.commands.has(name) || 
                               client.aliases.has(name);
      
      if (isBuiltInCommand) {
        return message.reply('You cannot create a custom command with the same name as a built-in command!');
      }
      
      // Check if response is too long
      if (response.length > 2000) {
        return message.reply('Command response must be 2000 characters or less!');
      }
      
      // Check if command already exists
      const existingCommand = await CustomCommand.findOne({ 
        guildID: message.guild.id,
        name: name
      });
      
      if (existingCommand) {
        // Update existing command
        await CustomCommand.updateOne(
          { guildID: message.guild.id, name: name },
          { response: response, createdBy: message.author.id }
        );
        
        const embed = new EmbedBuilder()
          .setTitle('Custom Command Updated')
          .setDescription(`Command \`${name}\` has been updated.`)
          .addFields({ name: 'Response', value: response })
          .setColor('#0099ff')
          .setFooter({ 
            text: `Updated by ${message.author.tag}`,
            iconURL: message.author.displayAvatarURL({ dynamic: true })
          })
          .setTimestamp();
        
        await message.reply({ embeds: [embed] });
      } else {
        // Create new command
        const newCommand = new CustomCommand({
          guildID: message.guild.id,
          name: name,
          response: response,
          createdBy: message.author.id
        });
        
        await newCommand.save();
        
        const embed = new EmbedBuilder()
          .setTitle('Custom Command Created')
          .setDescription(`Command \`${name}\` has been created.`)
          .addFields({ name: 'Response', value: response })
          .setColor('#00ff00')
          .setFooter({ 
            text: `Created by ${message.author.tag}`,
            iconURL: message.author.displayAvatarURL({ dynamic: true })
          })
          .setTimestamp();
        
        await message.reply({ embeds: [embed] });
      }
      
    } catch (error) {
      logger.error(`Error in legacy customcommand command: ${error}`);
      
      // Special error handling for duplicate key errors
      if (error.code === 11000) {
        return message.reply('A custom command with this name already exists!');
      }
      
      message.reply('There was an error creating the custom command!');
    }
  }
};