const mongoose = require('mongoose');

const AppIDSchema = new mongoose.Schema({
  guildID: { 
    type: String,
    required: true
  },
  userID: { 
    type: String,
    required: true 
  },
  appID: { 
    type: String,
    required: true
  }
});

module.exports = mongoose.model('AppID', AppIDSchema);