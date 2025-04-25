const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createTranscript } = require('discord-html-transcripts');
const Ticket = require('../models/ticket/Ticket');
const TicketSettings = require('../models/ticket/TicketSettings');
const logger = require('./logger');

/**
 * Generates a transcript for a ticket channel
 * @param {TextChannel|ThreadChannel} channel - The ticket channel/thread
 * @param {Guild} guild - The guild the ticket belongs to
 * @param {Object} ticketData - The ticket data from the database
 * @param {User} user - The user who closed the ticket
 * @returns {Promise<Object>} Object containing the transcript file
 */
async function generateTranscript(channel, guild, ticketData, user) {
  try {
    // Generate transcript attachment
    const transcript = await createTranscript(channel, {
      limit: -1, // Fetch all messages
      filename: `ticket-${ticketData.ticketNumber}.html`,
      saveImages: true,
      poweredBy: false,
      footerText: `Transcript for Ticket #${ticketData.ticketNumber} | Closed by ${user.tag}`,
    });

    // Get guild settings
    const guildSettings = await TicketSettings.findOne({ guildID: guild.id });
    
    if (!guildSettings || !guildSettings.transcriptChannel) {
      return {
        file: transcript,
        success: false,
        reason: 'No transcript channel configured'
      };
    }

    // Get transcript channel
    const transcriptChannel = await guild.channels.fetch(guildSettings.transcriptChannel).catch(() => null);
    
    if (!transcriptChannel) {
      return {
        file: transcript,
        success: false,
        reason: 'Transcript channel not found'
      };
    }

    // Create embed
    const embed = new EmbedBuilder()
      .setTitle(`Ticket Transcript #${ticketData.ticketNumber}`)
      .setDescription(`**Ticket Creator:** <@${ticketData.creatorID}>\n**Closed By:** <@${user.id}>\n**Ticket Topic:** ${ticketData.topic}`)
      .setColor('#2F3136')
      .setFooter({ text: `Ticket ID: ${ticketData.ticketID}` })
      .setTimestamp();

    // Send transcript to the transcript channel
    const message = await transcriptChannel.send({
      embeds: [embed],
      files: [transcript]
    }).catch(error => {
      logger.error(`Error sending transcript: ${error}`);
      return null;
    });

    if (!message) {
      return {
        file: transcript,
        success: false,
        reason: 'Failed to send transcript message'
      };
    }

    // Update ticket with transcript URL
    ticketData.transcriptURL = message.url;
    await ticketData.save();

    return {
      file: transcript,
      success: true,
      url: message.url
    };

  } catch (error) {
    logger.error(`Error generating transcript: ${error}`);
    return {
      success: false,
      reason: `Error: ${error.message}`
    };
  }
}

module.exports = { generateTranscript };