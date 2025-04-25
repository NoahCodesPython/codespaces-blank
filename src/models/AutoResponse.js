const mongoose = require('mongoose');

const autoResponseSchema = new mongoose.Schema({
  guildID: {
    type: String,
    required: true
  },
  trigger: {
    type: String,
    required: true
  },
  response: {
    type: String,
    required: true
  },
  // Is this an exact match or contains match
  exactMatch: {
    type: Boolean,
    default: false
  },
  // Is this trigger case sensitive
  caseSensitive: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to ensure triggers are unique per guild
autoResponseSchema.index({ guildID: 1, trigger: 1 }, { unique: true });

module.exports = mongoose.model('AutoResponse', autoResponseSchema);