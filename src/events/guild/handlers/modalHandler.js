const { EmbedBuilder } = require('discord.js');
const logger = require('../../../utils/logger');

/**
 * Handle embed modal submissions
 * @param {ModalSubmitInteraction} interaction 
 * @param {Client} client 
 */
async function handleEmbedModal(interaction, client) {
  try {
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
  } catch (error) {
    logger.error(`Error handling embed modal: ${error}`);
    throw error;
  }
}

// Check if a string is a valid URL
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

module.exports = { handleEmbedModal };