const mongoose = require('mongoose');

const tempVCSchema = new mongoose.Schema({
  guildID: {
    type: String,
    required: true
  },
  enabled: {
    type: Boolean,
    default: false
  },
  categoryID: {
    type: String,
    default: null
  },
  joinChannelID: {
    type: String,
    default: null
  },
  // Store active created voice channels
  tempChannels: [{
    channelID: {
      type: String,
      required: true
    },
    ownerID: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Configuration for new channels
  defaults: {
    // Default name format: {username}'s Channel, {game} with Friends, etc.
    nameFormat: {
      type: String,
      default: "{username}'s Channel"
    },
    // Default user limit (0 = unlimited)
    userLimit: {
      type: Number,
      default: 0
    },
    // Whether channels are private by default
    private: {
      type: Boolean,
      default: false
    }
  }
});

// Ensure only one config per guild
tempVCSchema.index({ guildID: 1 }, { unique: true });

module.exports = mongoose.model('TempVC', tempVCSchema);