
const { ShardingManager } = require('discord.js'); // Import ShardingManager
const logger = require('./utils/logger'); // Your logging utility
const { token } = require('./utils/variables.js'); // Your bot token

// Create a new Sharding Manager instance
const manager = new ShardingManager('./index.js', {
  token: process.env.TOKEN || token,
  totalShards: 1,
  respawn: true,
  timeout: 60000
});

manager.on('shardCreate', shard => {
  logger.info(`Launching Shard ${shard.id + 1}`, { label: 'Shard' });

  shard.on('ready', () => {
    logger.info(`Shard ${shard.id} is ready!`, { label: 'Shard' });
  });

  shard.on('error', error => {
    logger.error(`Shard ${shard.id} encountered an error: ${error.message}`, { label: 'Shard' });
  });

  shard.on('exit', (code) => {
    logger.warn(`Shard ${shard.id} exited with code ${code}`, { label: 'Shard' });
  });
});

// Function to handle graceful shutdown
async function shutdownManager() {
  logger.info('Shutting down all shards gracefully...', { label: 'Process' });

  const promises = manager.shards.map(shard => {
    return new Promise((resolve) => {
      shard.send('shutdown').then(() => resolve()).catch((err) => {
        logger.error(`Failed to shutdown shard ${shard.id}: ${err.message}`, { label: 'Process' });
        resolve();
      });
    });
  });

  await Promise.all(promises);
  process.exit(0); // Exit the process
}

// Listen for shutdown signals
process.on('SIGINT', shutdownManager);
process.on('SIGTERM', shutdownManager);

// Start the Sharding Manager
manager.spawn().catch(err => {
  logger.error(`Failed to spawn shards: ${err.message}`, { label: 'Sharding' });
});

// Handle unhandled promise rejections globally
process.on('unhandledRejection', (error) => {
  logger.error(`Unhandled promise rejection: ${error.message}`, { label: 'Process' });
});

// Your bot logic goes here:
manager.on('ready', () => {
  logger.info('Manager is ready!', { label: 'Manager' });
  // Optionally, you can also log the number of spawned shards:
  logger.info(`Total shards: ${manager.shards.size}`, { label: 'Manager' });
});
