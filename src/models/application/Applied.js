const mongoose = require('mongoose');

const AppliedSchema = new mongoose.Schema({
  guildID: { 
    type: String,
    required: true
  },
  userID: { 
    type: String,
    required: true
  },
  appID: { 
    type: Array, 
    default: [] 
  },
  hasApplied: { 
    type: Boolean, 
    default: true 
  }
});

module.exports = mongoose.model('Applied', AppliedSchema);