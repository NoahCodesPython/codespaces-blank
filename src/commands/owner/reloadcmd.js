const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isOwner } = require('../../utils/ownerCheck');
const logger = require('../../utils/logger');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'reloadcmd',
  description: 'Reloads a command',
  category: 'owner',
  aliases: ['reload', 'refreshcmd'],
  usage: '<command> [category]',
  examples: ['reloadcmd ping', 'reloadcmd ban moderation'],
  userPermissions: [],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('reloadcmd')
    .setDescription('Reloads a command')
    .addStringOption(option => 
      option.setName('command')
        .setDescription('The command to reload')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('category')
        .setDescription('The category of the command')
        .setRequired(false)),
  
  // Slash command execution
  async execute(interaction) {
    try {
      // Check if executor is a bot owner
      const isExecutorOwner = await isOwner(interaction.user.id);
      
      if (!isExecutorOwner) {
        return interaction.reply({
          content: 'You do not have permission to use this command.',
          ephemeral: true
        });
      }
      
      // Defer reply
      await interaction.deferReply();
      
      const commandName = interaction.options.getString('command').toLowerCase();
      const category = interaction.options.getString('category')?.toLowerCase();
      
      // Find the command
      const command = interaction.client.commands.get(commandName) || 
                      interaction.client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
      
      if (!command) {
        return interaction.editReply(`No command with name or alias \`${commandName}\` was found.`);
      }
      
      // Get the determined category or use the command's category
      const commandCategory = category || command.category;
      
      // Create path to command file
      const commandsPath = path.join(process.cwd(), 'src', 'commands', commandCategory);
      const commandPath = path.join(commandsPath, `${command.name}.js`);
      
      // Check if file exists
      if (!fs.existsSync(commandPath)) {
        return interaction.editReply(`Command file for \`${command.name}\` not found at expected path: ${commandPath}`);
      }
      
      try {
        // Remove command from cache
        delete require.cache[require.resolve(commandPath)];
        
        // Load the command file again
        const newCommand = require(commandPath);
        
        // Update the command in the collection
        interaction.client.commands.set(newCommand.name, newCommand);
        
        // Update slash command data
        if (newCommand.data) {
          interaction.client.slashCommands.set(newCommand.name, newCommand);
        }
        
        // Create success embed
        const embed = new EmbedBuilder()
          .setTitle('Command Reloaded')
          .setDescription(`Command \`${newCommand.name}\` was successfully reloaded.`)
          .setColor('#00FF00')
          .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        
        // Log the action
        logger.info(`${interaction.user.tag} (${interaction.user.id}) reloaded command: ${newCommand.name}`);
        
      } catch (error) {
        logger.error(`Error reloading command ${command.name}: ${error}`);
        return interaction.editReply(`There was an error while reloading command \`${command.name}\`:\n\`${error.message}\``);
      }
      
    } catch (error) {
      logger.error(`Error in reloadcmd command: ${error}`);
      
      if (interaction.deferred) {
        await interaction.editReply({ 
          content: 'There was an error reloading the command.'
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
      // Check if executor is a bot owner
      const isExecutorOwner = await isOwner(message.author.id);
      
      if (!isExecutorOwner) {
        return message.reply('You do not have permission to use this command.');
      }
      
      if (!args.length) {
        return message.reply('Please provide a command to reload.');
      }
      
      const commandName = args[0].toLowerCase();
      const category = args[1]?.toLowerCase();
      
      // Find the command
      const command = client.commands.get(commandName) || 
                      client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
      
      if (!command) {
        return message.reply(`No command with name or alias \`${commandName}\` was found.`);
      }
      
      // Get the determined category or use the command's category
      const commandCategory = category || command.category;
      
      // Create path to command file
      const commandsPath = path.join(process.cwd(), 'src', 'commands', commandCategory);
      const commandPath = path.join(commandsPath, `${command.name}.js`);
      
      // Check if file exists
      if (!fs.existsSync(commandPath)) {
        return message.reply(`Command file for \`${command.name}\` not found at expected path: ${commandPath}`);
      }
      
      try {
        // Remove command from cache
        delete require.cache[require.resolve(commandPath)];
        
        // Load the command file again
        const newCommand = require(commandPath);
        
        // Update the command in the collection
        client.commands.set(newCommand.name, newCommand);
        
        // Update slash command data
        if (newCommand.data) {
          client.slashCommands.set(newCommand.name, newCommand);
        }
        
        // Create success embed
        const embed = new EmbedBuilder()
          .setTitle('Command Reloaded')
          .setDescription(`Command \`${newCommand.name}\` was successfully reloaded.`)
          .setColor('#00FF00')
          .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
          .setTimestamp();
        
        await message.reply({ embeds: [embed] });
        
        // Log the action
        logger.info(`${message.author.tag} (${message.author.id}) reloaded command: ${newCommand.name}`);
        
      } catch (error) {
        logger.error(`Error reloading command ${command.name}: ${error}`);
        return message.reply(`There was an error while reloading command \`${command.name}\`:\n\`${error.message}\``);
      }
      
    } catch (error) {
      logger.error(`Error in legacy reloadcmd command: ${error}`);
      message.reply('There was an error reloading the command.');
    }
  }
};