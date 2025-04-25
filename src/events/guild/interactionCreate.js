const { InteractionType } = require('discord.js');
const logger = require('../../utils/logger');

module.exports = {
  name: 'interactionCreate',
  once: false,
  
  async execute(client, interaction) {
    try {
      // Handle slash commands
      if (interaction.type === InteractionType.ApplicationCommand) {
        const command = client.slashCommands.get(interaction.commandName);
        
        if (!command) {
          return interaction.reply({ 
            content: 'This command no longer exists or is outdated. Please reload Discord.',
            ephemeral: true
          });
        }
        
        // Check user permissions
        if (command.userPermissions && command.userPermissions.length > 0) {
          if (!interaction.member.permissions.has(command.userPermissions)) {
            return interaction.reply({
              content: 'You do not have permission to use this command!',
              ephemeral: true
            });
          }
        }
        
        // Check bot permissions
        if (command.botPermissions && command.botPermissions.length > 0) {
          const missingPermissions = [];
          
          for (const permission of command.botPermissions) {
            if (!interaction.guild.members.me.permissions.has(permission)) {
              missingPermissions.push(permission);
            }
          }
          
          if (missingPermissions.length > 0) {
            return interaction.reply({
              content: `I'm missing the following permissions: ${missingPermissions.join(', ')}`,
              ephemeral: true
            });
          }
        }
        
        // Execute the command
        if (command.execute) {
          await command.execute(interaction);
        } else {
          logger.error(`Command ${interaction.commandName} does not have an execute method`);
          return interaction.reply({
            content: 'There was an error while executing this command!',
            ephemeral: true
          });
        }
      }
      
      // Handle autocomplete interactions
      if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
        const command = client.slashCommands.get(interaction.commandName);
        
        if (!command || !command.autocomplete) {
          return;
        }
        
        try {
          await command.autocomplete(interaction);
        } catch (error) {
          logger.error(`Error with autocomplete: ${error}`);
        }
      }
      
      // Handle buttons
      if (interaction.isButton()) {
        // We can implement button handling here later
      }
      
      // Handle select menus
      if (interaction.isStringSelectMenu()) {
        // We can implement select menu handling here later
      }
      
      // Handle modals
      if (interaction.isModalSubmit()) {
        // We can implement modal handling here later
      }
      
    } catch (error) {
      logger.error(`Error with interaction: ${error}`);
      console.error(error);
      
      // Respond to the user if we haven't already
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: 'There was an error while executing this command!',
          ephemeral: true
        }).catch(() => {});
      } else {
        await interaction.reply({
          content: 'There was an error while executing this command!',
          ephemeral: true
        }).catch(() => {});
      }
    }
  }
};