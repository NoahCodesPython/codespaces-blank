const OpenAI = require('openai');
const logger = require('./logger');

// Create the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate an image using DALL-E 3
 * @param {string} prompt - The text prompt for image generation
 * @param {string} size - Image size (1024x1024, 1792x1024, or 1024x1792)
 * @param {string} quality - Image quality (standard or hd)
 * @param {string} style - Image style (vivid or natural)
 * @returns {Promise<Object>} - The generated image data
 */
async function generateImage(prompt, size = '1024x1024', quality = 'standard', style = 'vivid') {
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
    logger.error(`Error generating image: ${error.message}`);
    throw error;
  }
}

/**
 * Chat completion with GPT-4o
 * @param {Array} messages - Array of message objects { role, content }
 * @returns {Promise<string>} - The completion text
 */
async function getChatCompletion(messages) {
  try {
    logger.info(`Getting chat completion for ${messages.length} messages`);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: messages,
      temperature: 0.7,
    });
    
    return response.choices[0].message.content;
  } catch (error) {
    logger.error(`Error getting chat completion: ${error.message}`);
    throw error;
  }
}

module.exports = {
  generateImage,
  getChatCompletion,
};