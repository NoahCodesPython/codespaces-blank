const mongoose = require('mongoose');

const afkSchema = new mongoose.Schema({
  userID: {
    type: String,
    required: true
  },
  serverID: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    default: 'AFK'
  },
  oldNickname: {
    type: String,
    required: true
  },
  time: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AFK', afkSchema);