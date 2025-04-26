const { HfInference } = require('@huggingface/inference');
const logger = require('./logger');

const hf = new HfInference(process.env.HUGGINGFACE_TOKEN);

// Rate limiting configuration
const MAX_RETRIES = 5;
const BASE_DELAY = 2000;
const RATE_LIMIT = 1;
const RATE_WINDOW = 60 * 1000;

let requestQueue = [];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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

async function generateImage(prompt, size = '1024x1024') {
  if (!prompt || prompt.trim().length === 0) {
    throw new Error('Prompt cannot be empty');
  }

  let retries = 0;

  while (retries < MAX_RETRIES) {
    await checkRateLimit();
    try {
      logger.info(`Generating image with prompt: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"`);

      const response = await hf.textToImage({
        model: 'stabilityai/stable-diffusion-2',
        inputs: prompt,
      });

      logger.info('Image generated successfully');
      return { url: URL.createObjectURL(response) };

    } catch (error) {
      retries++;
      if (retries === MAX_RETRIES) {
        logger.error('Max retries reached');
        throw new Error('Failed to generate image. Please try again later.');
      }
      const delay = BASE_DELAY * Math.pow(2, retries);
      logger.warn(`Error encountered, retrying in ${delay}ms`);
      await sleep(delay);
    }
  }
}

async function getChatCompletion(messages) {
  let retries = 0;

  while (retries < MAX_RETRIES) {
    await checkRateLimit();
    try {
      logger.info(`Getting chat completion for ${messages.length} messages`);

      const response = await hf.textGeneration({
        model: 'microsoft/DialoGPT-large',
        inputs: messages[messages.length - 1].content,
        parameters: {
          max_length: 1000,
          temperature: 0.7,
        },
      });

      return response.generated_text;

    } catch (error) {
      retries++;
      if (retries === MAX_RETRIES) {
        logger.error('Max retries reached');
        throw new Error('Failed to get response. Please try again later.');
      }
      const delay = BASE_DELAY * Math.pow(2, retries);
      logger.warn(`Error encountered, retrying in ${delay}ms`);
      await sleep(delay);
    }
  }
}

module.exports = {
  generateImage,
  getChatCompletion,
};