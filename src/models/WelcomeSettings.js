const mongoose = require('mongoose');

const welcomeSchema = new mongoose.Schema({

  guildID: { type: String, required: true, unique: true },

  channelID: String,

  enabled: { type: Boolean, default: false },

  gifURL: String,

  customMessage: String

});

module.exports = mongoose.model('WelcomeSettings', welcomeSchema);