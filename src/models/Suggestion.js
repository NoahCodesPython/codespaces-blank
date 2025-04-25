const mongoose = require('mongoose');

const suggestionSchema = new mongoose.Schema({
  guildID: {
    type: String,
    required: true
  },
  channelID: {
    type: String,
    required: true
  },
  messageID: {
    type: String,
    required: true
  },
  suggestionID: {
    type: Number,
    required: true
  },
  suggestion: {
    type: String,
    required: true
  },
  userID: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'implemented', 'considered'],
    default: 'pending'
  },
  reason: {
    type: String,
    default: null
  },
  dateCreated: {
    type: Date,
    default: Date.now
  },
  dateResponded: {
    type: Date,
    default: null
  },
  respondedBy: {
    type: String,
    default: null
  },
  upvotes: {
    type: Number,
    default: 0
  },
  downvotes: {
    type: Number,
    default: 0
  },
  voters: [
    {
      userID: String,
      vote: String // 'up' or 'down'
    }
  ]
});

module.exports = mongoose.model('Suggestion', suggestionSchema);