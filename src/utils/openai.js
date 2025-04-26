
const OpenAI = require('openai');
const logger = require('./logger');

// Create the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Retry and rate limit configuration
const MAX_RETRIES = 3;
const BASE_DELAY = 1000; // 1 second
const RATE_LIMIT = 3; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute in milliseconds

// Rate limiting queue
let requestQueue = [];

/**
 * Sleep for a given number of milliseconds
 * @param {number} ms - milliseconds to sleep
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Check and maintain rate limits
 */
async function checkRateLimit() {
  const now = Date.now();
  requestQueue = requestQueue.filter(time => now - time < RATE_WINDOW);
  
  if (requestQueue.length >= RATE_LIMIT) {
    const oldestRequest = requestQueue[0];
    const waitTime = RATE_WINDOW - (now - oldestRequest);
    logger.warn(`Rate limit reached, waiting ${waitTime}ms`);
    await sleep(waitTime);
    return checkRateLimit();
  }
  
  requestQueue.push(now);
}

/**
 * Generate an image using DALL-E 3 with retry logic
 */
async function generateImage(prompt, size = '1024x1024', quality = 'standard', style = 'vivid') {
  let retries = 0;
  
  while (retries < MAX_RETRIES) {
    await checkRateLimit();
    try {
      // Validate inputs
      const validSizes = ['1024x1024', '1792x1024', '1024x1792'];
      const validQualities = ['standard', 'hd'];
      const validStyles = ['vivid', 'natural'];
      
      if (!validSizes.includes(size)) {
        throw new Error(`Invalid size: ${size}. Must be one of: ${validSizes.join(', ')}`);
      }
      
      if (!validQualities.includes(quality)) {
        throw new Error(`Invalid quality: ${quality}. Must be one of: ${validQualities.join(', ')}`);
      }
      
      if (!validStyles.includes(style)) {
        throw new Error(`Invalid style: ${style}. Must be one of: ${validStyles.join(', ')}`);
      }
      
      logger.info(`Generating image with prompt: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`);
      
      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: size,
        quality: quality,
        style: style,
      });
      
      logger.info('Image generated successfully');
      return response.data[0];
      
    } catch (error) {
      if (error.status === 429) {
        retries++;
        if (retries === MAX_RETRIES) {
          logger.error('Max retries reached for rate limit');
          throw new Error('OpenAI API rate limit reached. Please try again later.');
        }
        const delay = BASE_DELAY * Math.pow(2, retries);
        logger.warn(`Rate limit hit, retrying in ${delay}ms`);
        await sleep(delay);
        continue;
      }
      logger.error(`Error generating image: ${error.message}`);
      throw error;
    }
  }
}

/**
 * Chat completion with GPT-4o with retry logic
 */
async function getChatCompletion(messages) {
  let retries = 0;
  
  while (retries < MAX_RETRIES) {
    await checkRateLimit();
    try {
      logger.info(`Getting chat completion for ${messages.length} messages`);
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages,
        temperature: 0.7,
      });
      
      return response.choices[0].message.content;
      
    } catch (error) {
      if (error.status === 429) {
        retries++;
        if (retries === MAX_RETRIES) {
          logger.error('Max retries reached for rate limit');
          throw new Error('OpenAI API rate limit reached. Please try again later.');
        }
        const delay = BASE_DELAY * Math.pow(2, retries);
        logger.warn(`Rate limit hit, retrying in ${delay}ms`);
        await sleep(delay);
        continue;
      }
      logger.error(`Error getting chat completion: ${error.message}`);
      throw error;
    }
  }
}

module.exports = {
  generateImage,
  getChatCompletion,
};
