const mongoose = require('mongoose');

const customCommandSchema = new mongoose.Schema({
  guildID: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  response: {
    type: String,
    required: true
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

// Compound index to ensure command names are unique per guild
customCommandSchema.index({ guildID: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('CustomCommand', customCommandSchema);