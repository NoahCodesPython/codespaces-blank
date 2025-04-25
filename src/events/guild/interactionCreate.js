const { Events, InteractionType, ComponentType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const logger = require('../../utils/logger');

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