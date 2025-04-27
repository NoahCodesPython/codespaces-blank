
const { WebhookClient } = require('discord.js');
const logger = require('./logger');
const config = require('../config');

/**
 * Create and return a webhook client if the webhook URL exists in the config
 * @param {string} webhookType - The type of webhook from config.webhooks
 * @returns {WebhookClient|null} Webhook client or null if not configured
 */
function getWebhookClient(webhookType) {
  try {
    if (!config.webhooks || !config.webhooks[webhookType]) {
      return null;
    }
    
    const webhookUrl = config.webhooks[webhookType];
    
    if (!webhookUrl) {
      return null;
    }
    
    return new WebhookClient({ url: webhookUrl });
  } catch (error) {
    logger.error(`Error creating webhook client: ${error}`);
    return null;
  }
}

/**
 * Send a message to a webhook
 * @param {Object} options - The message options to send
 * @param {string} [webhookType='logs'] - The type of webhook from config.webhooks
 */
async function send(options, webhookType = 'logs') {
  try {
    const webhookClient = getWebhookClient(webhookType);
    
    if (!webhookClient) {
      logger.debug(`No webhook configured for type: ${webhookType}`);
      return;
    }
    
    await webhookClient.send(options);
  } catch (error) {
    logger.error(`Error sending webhook message: ${error}`);
  }
}

module.exports = {
  getWebhookClient,
  send
};
