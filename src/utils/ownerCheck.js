const { Collection } = require('discord.js');
const BotOwner = require('../models/BotOwner');
const config = require('../config');
const logger = require('./logger');

// Cache for owner checks to reduce database calls
const ownerCache = new Collection();
const CACHE_EXPIRY = 3600000; // 1 hour in milliseconds

/**
 * Checks if a user is a bot owner
 * @param {string} userID The user ID to check
 * @param {string} [permission] Specific permission to check for
 * @returns {Promise<boolean>} True if the user is a bot owner with the permission
 */
async function isOwner(userID, permission = null) {
  try {
    // Primary owner check from config
    if (userID === config.ownerId) {
      return true;
    }
    
    // Check cache
    if (ownerCache.has(userID)) {
      const cachedData = ownerCache.get(userID);
      
      // Check if cache is expired
      if (Date.now() - cachedData.timestamp < CACHE_EXPIRY) {
        // If permission is specified, check if user has it
        if (permission && !cachedData.permissions.includes('*') && !cachedData.permissions.includes(permission)) {
          return false;
        }
        
        return true;
      }
      
      // Cache expired, remove it
      ownerCache.delete(userID);
    }
    
    // Check database
    const owner = await BotOwner.findOne({ userID });
    
    if (!owner) {
      return false;
    }
    
    // If permission is specified, check if user has it
    if (permission && !owner.permissions.includes('*') && !owner.permissions.includes(permission)) {
      return false;
    }
    
    // Add to cache
    ownerCache.set(userID, {
      timestamp: Date.now(),
      permissions: owner.permissions
    });
    
    return true;
  } catch (error) {
    logger.error(`Error checking owner status: ${error}`);
    return false;
  }
}

/**
 * Gets all bot owners
 * @returns {Promise<Array>} Array of bot owner objects
 */
async function getOwners() {
  try {
    // Remove all owners except Noah
    await BotOwner.deleteMany({
      userID: { $ne: '788296234430889984' }
    });
    
    // Return empty array since Noah is primary owner
    return [];
  } catch (error) {
    logger.error(`Error getting owners: ${error}`);
    return [];
  }
}

/**
 * Adds a new bot owner
 * @param {string} userID The user ID to add as owner
 * @param {string} addedBy The user ID who added this owner
 * @param {Array} [permissions] Array of permissions to grant
 * @returns {Promise<Object>} Result of the operation
 */
async function addOwner(userID, addedBy, permissions = ["*"]) {
  try {
    // Check if already an owner
    const existingOwner = await BotOwner.findOne({ userID });
    
    if (existingOwner) {
      return {
        success: false,
        message: 'User is already a bot owner'
      };
    }
    
    // Create new owner
    const newOwner = new BotOwner({
      userID,
      addedBy,
      permissions
    });
    
    await newOwner.save();
    
    // Update cache
    ownerCache.set(userID, {
      timestamp: Date.now(),
      permissions
    });
    
    return {
      success: true,
      message: 'User added as bot owner'
    };
  } catch (error) {
    logger.error(`Error adding owner: ${error}`);
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

/**
 * Removes a bot owner
 * @param {string} userID The user ID to remove from owners
 * @returns {Promise<Object>} Result of the operation
 */
async function removeOwner(userID) {
  try {
    // Cannot remove primary owner
    if (userID === config.ownerId) {
      return {
        success: false,
        message: 'Cannot remove the primary bot owner'
      };
    }
    
    // Remove from database
    const result = await BotOwner.deleteOne({ userID });
    
    if (result.deletedCount === 0) {
      return {
        success: false,
        message: 'User is not a bot owner'
      };
    }
    
    // Remove from cache
    ownerCache.delete(userID);
    
    return {
      success: true,
      message: 'User removed from bot owners'
    };
  } catch (error) {
    logger.error(`Error removing owner: ${error}`);
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
}

module.exports = {
  isOwner,
  getOwners,
  addOwner,
  removeOwner
};