const mongoose = require('mongoose');

const botOwnerSchema = new mongoose.Schema({
  userID: {
    type: String,
    required: true,
    unique: true
  },
  addedBy: {
    type: String,
    required: true
  },
  addedAt: {
    type: Date,
    default: Date.now
  },
  permissions: {
    type: Array,
    default: ["*"] // * means all permissions
  }
});

module.exports = mongoose.model('BotOwner', botOwnerSchema);