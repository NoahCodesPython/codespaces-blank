const axios = require('axios');
const logger = require('./logger');

/**
 * Fetches a random post from the specified subreddit
 * @param {string} subreddit - The subreddit to fetch from
 * @returns {Promise<Object|null>} The post data or null if an error occurred
 */
async function getRandomPost(subreddit) {
  try {
    // Fetch top 100 hot posts from the subreddit
    const response = await axios.get(
      `https://www.reddit.com/r/${subreddit}/hot.json?limit=100`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        }
      }
    );

    if (!response.data.data.children || response.data.data.children.length === 0) {
      logger.warn(`No posts found in subreddit: ${subreddit}`);
      return null;
    }

    // Filter posts for images and no NSFW content (unless it's an NSFW channel)
    const validPosts = response.data.data.children.filter(post => {
      const data = post.data;
      // Check if post has an image and isn't stickied
      return (
        !data.stickied &&
        !data.over_18 && // No NSFW content
        data.post_hint === 'image' // Only image posts
      );
    });

    if (validPosts.length === 0) {
      logger.warn(`No valid posts found in subreddit: ${subreddit}`);
      return null;
    }

    // Get a random post from the filtered posts
    const randomPost = validPosts[Math.floor(Math.random() * validPosts.length)];
    return randomPost.data;

  } catch (error) {
    logger.error(`Error fetching from Reddit: ${error.message}`);
    return null;
  }
}

/**
 * Fetches a meme from a random meme subreddit
 * @returns {Promise<Object|null>} The meme post data or null if an error occurred
 */
async function getRandomMeme() {
  // List of popular meme subreddits
  const memeSubreddits = [
    'memes',
    'dankmemes',
    'wholesomememes',
    'MemeEconomy',
    'PrequelMemes',
    'HistoryMemes'
  ];

  // Choose a random subreddit
  const randomSubreddit = memeSubreddits[Math.floor(Math.random() * memeSubreddits.length)];
  
  return await getRandomPost(randomSubreddit);
}

module.exports = {
  getRandomPost,
  getRandomMeme
};