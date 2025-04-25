const mongoose = require('mongoose');
const logger = require('./logger');
require('dotenv').config();

// MongoDB connection function
async function connect() {
  try {
    const mongoURI = process.env.MONGO_URI;
    
    if (!mongoURI) {
      throw new Error('No MongoDB URI provided. Please add MONGO_URI to your .env file.');
    }
    
    // Connect to MongoDB (options no longer needed in recent versions)
    await mongoose.connect(mongoURI);
    
    mongoose.connection.on('error', err => {
      logger.error(`MongoDB connection error: ${err}`);
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
      // Try to reconnect
      setTimeout(() => connect(), 5000);
    });
    
    return mongoose.connection;
  } catch (error) {
    logger.error(`Failed to connect to MongoDB: ${error}`);
    process.exit(1);
  }
}

module.exports = { connect };
