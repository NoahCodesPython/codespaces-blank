const { HfInference } = require('@huggingface/inference');
const logger = require('./logger');

const hf = new HfInference(process.env.HUGGINGFACE_TOKEN);

// Rate limiting configuration
const MAX_RETRIES = 3;
const BASE_DELAY = 1000;
const RATE_LIMIT = 2;
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

async function getChatCompletion(messages) {
  let retries = 0;
  const userMessage = messages[messages.length - 1].content;

  while (retries < MAX_RETRIES) {
    try {
      logger.info(`Getting chat completion for message`);

      const response = await hf.textGeneration({
        model: 'gpt2',
        inputs: userMessage,
        parameters: {
          max_new_tokens: 250,
          temperature: 0.7,
          top_p: 0.9,
          return_full_text: false
        },
      });

      return response.generated_text;

    } catch (error) {
      retries++;
      if (retries === MAX_RETRIES) {
        logger.error(`Failed after ${MAX_RETRIES} retries`);
        throw new Error('Unable to get response at this time. Please try again later.');
      }
      const delay = BASE_DELAY * Math.pow(2, retries);
      logger.warn(`Error encountered, retrying in ${delay}ms`);
      await sleep(delay);
    }
  }
}

module.exports = {
  getChatCompletion
};