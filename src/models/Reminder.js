const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  userID: {
    type: String,
    required: true
  },
  channelID: {
    type: String,
    required: true
  },
  guildID: {
    type: String,
    required: true
  },
  reminder: {
    type: String,
    required: true
  },
  reminderID: {
    type: String,
    required: true,
    unique: true
  },
  time: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Reminder', reminderSchema);