const { Events, InteractionType, ComponentType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const logger = require('../../utils/logger');
const config = require('../../config');

// Import specific handlers for better organization
const { handleTicketCreate } = require('./handlers/ticketButtonHandler');
const { handleTicketClose } = require('./handlers/ticketButtonHandler');
const { handleSuggestionVote } = require('./handlers/suggestionHandler');
const { handleEmbedModal } = require('./handlers/modalHandler');

// THIS IS A SINGLETON OBJECT: Only one instance of this exists no matter how many times it's required
// Use process-wide cache for processed interactions
if (!global._processedInteractions) {
  global._processedInteractions = new Map();
  global._handlerExecutionCount = 0;
  global._lastCleanupTime = Date.now();
  
  // Set up periodic cleanup to prevent memory leaks
  setInterval(() => {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [id, timestamp] of global._processedInteractions.entries()) {
      if (now - timestamp > 60000) { // 1 minute
        global._processedInteractions.delete(id);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      logger.debug(`Cleaned up ${cleaned} old interactions from cache`);
    }
  }, 60000); // Clean every minute
}

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    try {
      // Increment the global execution counter
      global._handlerExecutionCount++;
      const executionNumber = global._handlerExecutionCount;
      
      // Log minimal execution info
      logger.debug(`Interaction handler execution #${executionNumber} for interaction ${interaction.id}`);
      
      // CRITICAL: Skip if we've already processed this interaction
      if (global._processedInteractions.has(interaction.id)) {
        logger.debug(`[DUPLICATE] Skipping already processed interaction: ${interaction.id}`);
        return;
      }
      
      // Mark this interaction as processed immediately
      global._processedInteractions.set(interaction.id, Date.now());
      
      // Check if we need to clean up the cache (every 100 executions)
      if (executionNumber % 100 === 0) {
        const now = Date.now();
        let cleanedCount = 0;
        
        for (const [id, timestamp] of global._processedInteractions.entries()) {
          if (now - timestamp > 300000) { // 5 minutes
            global._processedInteractions.delete(id);
            cleanedCount++;
          }
        }
        
        if (cleanedCount > 0) {
          logger.debug(`Cleaned up ${cleanedCount} old interactions`);
        }
      }
      
      // Log minimal interaction info
      logger.debug(`Processing interaction: ${interaction.id}, type: ${interaction.type}, ${interaction.commandName || interaction.customId || "unknown"}`);
      
      // HANDLE SLASH COMMANDS (ApplicationCommand - type 2)
      if (interaction.type === InteractionType.ApplicationCommand) {
        // Get the command from the client.slashCommands collection
        const command = client.slashCommands.get(interaction.commandName);
        
        // If the command doesn't exist, log and return
        if (!command) {
          logger.warn(`Command not found in collection: ${interaction.commandName}`);
          return;
        }
        
        // Check for maintenance mode
        if (global.maintenanceMode && global.maintenanceMode.enabled) {
          // Allow specified commands to work during maintenance
          const allowedCommands = global.maintenanceMode.allowedCommands || ['help', 'ping', 'maintenance'];
          const isOwner = await require('../../utils/ownerCheck').isOwner(interaction.user.id);
          
          // Allow owners to use any command during maintenance
          if (!isOwner && !allowedCommands.includes(command.name)) {
            const maintenanceEmbed = new EmbedBuilder()
              .setTitle('⚠️ Maintenance Mode Active')
              .setDescription(global.maintenanceMode.message || 'The bot is currently in maintenance mode. Please try again later.')
              .setColor('#FF9900')
              .setFooter({ text: 'Aquire Bot Maintenance' })
              .setTimestamp();
            
            return interaction.reply({ embeds: [maintenanceEmbed], ephemeral: true });
          }
        }
        
        try {
          // Execute the command
          await command.execute(interaction, client);
          logger.debug(`Successfully executed command: ${command.name}`);
        } catch (error) {
          logger.error(`Error executing command ${interaction.commandName}: ${error}`);
          
          // Reply with error message if possible
          try {
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
          } catch (replyError) {
            logger.error(`Failed to send error message: ${replyError}`);
          }
        }
      }
      
      // HANDLE MODAL SUBMISSIONS (ModalSubmit - type 5)
      else if (interaction.type === InteractionType.ModalSubmit) {
        if (interaction.customId === 'embed_modal' || interaction.customId === 'embed_modal_legacy') {
          try {
            await handleEmbedModal(interaction, client);
          } catch (error) {
            logger.error(`Error in modal submit event: ${error}`);
            await replyWithError(interaction, 'There was an error processing your modal submission.');
          }
        }
        // Bug report modal handler
        else if (interaction.customId === 'bug_report_modal') {
          try {
            // Get the data from the modal
            const bugName = interaction.fields.getTextInputValue('bug_name');
            const bugDescription = interaction.fields.getTextInputValue('bug_description');
            const command = interaction.fields.getTextInputValue('command');
            const expectedBehavior = interaction.fields.getTextInputValue('expected_behavior');
            
            // Create a bug report embed
            const bugReportEmbed = new EmbedBuilder()
              .setTitle(`Bug Report: ${bugName}`)
              .setDescription(`A new bug has been reported by ${interaction.user.tag} (${interaction.user.id})`)
              .setColor('#FF0000')
              .addFields(
                { name: 'Command / Feature', value: command, inline: true },
                { name: 'Server', value: interaction.guild ? interaction.guild.name : 'DM', inline: true },
                { name: 'Server ID', value: interaction.guild ? interaction.guild.id : 'N/A', inline: true },
                { name: 'Bug Description', value: bugDescription },
                { name: 'Expected Behavior', value: expectedBehavior },
                { name: 'Reported At', value: new Date().toLocaleString() }
              )
              .setFooter({ text: 'Aquire Bug Report System' })
              .setTimestamp();
            
            // DM the bug report to the bot owner
            try {
              const owner = await client.users.fetch(config.ownerId);
              if (owner) {
                await owner.send({ embeds: [bugReportEmbed] });
                logger.info(`Bug report sent to owner: ${owner.tag}`);
              } else {
                logger.warn('Owner not found. Unable to send bug report.');
              }
            } catch (dmError) {
              logger.error(`Error sending bug report DM to owner: ${dmError.message}`);
            }
            
            // Reply to the user
            await interaction.reply({
              content: 'Thank you for your bug report! It has been sent to the developers and will be investigated soon.',
              ephemeral: true
            });
            
          } catch (error) {
            logger.error(`Error processing bug report modal: ${error}`);
            await replyWithError(interaction, 'There was an error submitting your bug report. Please try again later.');
          }
        }
        // Add more modal handlers here as needed
      }
      
      // HANDLE BUTTONS AND SELECT MENUS (MessageComponent - type 3)
      else if (interaction.type === InteractionType.MessageComponent) {
        // Handle Button interactions (componentType 2)
        if (interaction.componentType === ComponentType.Button) {
          // Ticket buttons
          if (interaction.customId === 'create_ticket') {
            try {
              await handleTicketCreate(interaction, client);
            } catch (error) {
              logger.error(`Error creating ticket: ${error}`);
              await replyWithError(interaction, 'There was an error creating your ticket.');
            }
          }
          else if (interaction.customId === 'close_ticket') {
            try {
              await handleTicketClose(interaction, client);
            } catch (error) {
              logger.error(`Error closing ticket: ${error}`);
              await replyWithError(interaction, 'There was an error closing the ticket.');
            }
          }
          // Suggestion vote buttons
          else if (interaction.customId.startsWith('suggestion_')) {
            try {
              await handleSuggestionVote(interaction, client);
            } catch (error) {
              logger.error(`Error in suggestion vote handler: ${error}`);
              await replyWithError(interaction, 'There was an error processing your vote.');
            }
          }
          // Application buttons
          else if (interaction.customId.startsWith('app_approve_') || 
                  interaction.customId.startsWith('app_decline_')) {
            logger.debug(`Received application button: ${interaction.customId}`);
            // Will be implemented when we add the application command
          }
          // Reaction role buttons
          else if (interaction.customId.startsWith('rr-')) {
            logger.debug(`Received reaction role button: ${interaction.customId}`);
            // Will be implemented in reaction role command
          }
          // Detailed bug report button
          else if (interaction.customId === 'detailed_bug_report') {
            try {
              // Create a modal for collecting detailed bug report information
              const modal = new ModalBuilder()
                .setCustomId('bug_report_modal')
                .setTitle('Detailed Bug Report');
              
              // Add input fields to the modal
              const bugNameInput = new TextInputBuilder()
                .setCustomId('bug_name')
                .setLabel('Bug Title')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('A brief title for this bug')
                .setMaxLength(100)
                .setRequired(true);
              
              const bugDescriptionInput = new TextInputBuilder()
                .setCustomId('bug_description')
                .setLabel('Bug Description')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Please describe the bug in detail. What happened?')
                .setMaxLength(1000)
                .setRequired(true);
              
              const commandInput = new TextInputBuilder()
                .setCustomId('command')
                .setLabel('Command / Feature')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Which command or feature is affected?')
                .setMaxLength(100)
                .setRequired(true);
              
              const expectedBehaviorInput = new TextInputBuilder()
                .setCustomId('expected_behavior')
                .setLabel('Expected Behavior')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('What did you expect to happen?')
                .setMaxLength(1000)
                .setRequired(true);
              
              // Add inputs to action rows
              const firstActionRow = new ActionRowBuilder().addComponents(bugNameInput);
              const secondActionRow = new ActionRowBuilder().addComponents(bugDescriptionInput);
              const thirdActionRow = new ActionRowBuilder().addComponents(commandInput);
              const fourthActionRow = new ActionRowBuilder().addComponents(expectedBehaviorInput);
              
              // Add action rows to the modal
              modal.addComponents(firstActionRow, secondActionRow, thirdActionRow, fourthActionRow);
              
              // Show the modal to the user
              await interaction.showModal(modal);
              
              logger.debug(`Detailed bug report modal shown to ${interaction.user.tag} (${interaction.user.id})`);
            } catch (error) {
              logger.error(`Error showing bug report modal: ${error}`);
              await replyWithError(interaction, 'There was an error opening the bug report form.');
            }
          }
          // Add more button handlers as needed
        }
        
        // Handle SelectMenu interactions (componentType 3)
        else if (interaction.componentType === ComponentType.StringSelect) {
          logger.debug(`Received select menu interaction: ${interaction.customId}`);
          // Implement select menu handlers as needed
        }
      }
    } catch (error) {
      logger.error(`Error in interactionCreate event: ${error}`);
    }
  }
};

// Helper function to handle error replies
async function replyWithError(interaction, message) {
  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ 
        content: message, 
        ephemeral: true 
      }).catch(() => {});
    } else {
      await interaction.reply({ 
        content: message, 
        ephemeral: true 
      }).catch(() => {});
    }
  } catch (error) {
    logger.error(`Failed to send error message: ${error}`);
  }
}