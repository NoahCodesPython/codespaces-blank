const { EmbedBuilder } = require('discord.js');
const logger = require('../../utils/logger');

module.exports = {
  name: 'interactionCreate',
  once: false,
  async execute(interaction, client) {
    // DISABLED - Moved to centralized handler
    return;
    
    try {
      // Check if the interaction is a modal submit
      if (interaction.type !== 5) return; // InteractionType.ModalSubmit is 5
      
      // Handle the embed creation modals
      if (interaction.customId === 'embed_modal' || interaction.customId === 'embed_modal_legacy') {
        logger.debug(`Processing embed modal submission from ${interaction.user.tag}`);
        
        // Get the data from the modal
        const title = interaction.fields.getTextInputValue('embed_title');
        const description = interaction.fields.getTextInputValue('embed_description');
        const colorInput = interaction.fields.getTextInputValue('embed_color');
        const imageUrl = interaction.fields.getTextInputValue('embed_image');
        const footerText = interaction.fields.getTextInputValue('embed_footer');
        
        // Parse the color input
        let color = '#0099ff'; // Default blue color
        if (colorInput) {
          try {
            // Validate hex code format
            if (colorInput.match(/^#[0-9A-Fa-f]{6}$/)) {
              color = colorInput;
            } else {
              // Try to convert the input to a valid hex color
              const normalized = colorInput.replace(/[^0-9A-Fa-f]/g, '');
              if (normalized.length === 6) {
                color = `#${normalized}`;
              } else if (normalized.length === 3) {
                color = `#${normalized[0]}${normalized[0]}${normalized[1]}${normalized[1]}${normalized[2]}${normalized[2]}`;
              }
            }
          } catch (e) {
            logger.warn(`Invalid color format provided: ${colorInput}`);
          }
        }
        
        // Create the embed
        const embed = new EmbedBuilder()
          .setColor(color)
          .setDescription(description)
          .setTimestamp();
        
        if (title) embed.setTitle(title);
        if (imageUrl && isValidUrl(imageUrl)) embed.setImage(imageUrl);
        if (footerText) embed.setFooter({ text: footerText });
        
        // Send the embed
        await interaction.reply({ content: 'Your embed has been created:', embeds: [embed] });
        
        // Send the embed to the channel
        await interaction.channel.send({ embeds: [embed] });
        
        logger.info(`Embed created by ${interaction.user.tag} in ${interaction.guild.name}`);
      }
    } catch (error) {
      logger.error(`Error in modal submit event: ${error}`);
      
      // Send an error message
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ 
            content: 'There was an error processing your embed! Please try again.', 
            ephemeral: true 
          });
        } else {
          await interaction.reply({ 
            content: 'There was an error processing your embed! Please try again.', 
            ephemeral: true 
          });
        }
      } catch (e) {
        logger.error(`Failed to send error message: ${e}`);
      }
    }
  }
};

// Check if a string is a valid URL
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}