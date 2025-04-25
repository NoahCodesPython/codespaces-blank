const mongoose = require('mongoose');

const suggestionSettingsSchema = new mongoose.Schema({
  guildID: {
    type: String,
    required: true,
    unique: true
  },
  enabled: {
    type: Boolean,
    default: false
  },
  suggestionChannel: {
    type: String,
    default: null
  },
  managerRole: {
    type: String,
    default: null
  },
  allowSelfVote: {
    type: Boolean,
    default: true
  },
  allowChangeVote: {
    type: Boolean,
    default: true
  },
  suggestionCount: {
    type: Number,
    default: 0
  },
  dmNotification: {
    type: Boolean,
    default: true
  },
  colors: {
    pending: {
      type: String,
      default: '#0099ff'
    },
    approved: {
      type: String,
      default: '#00FF00'
    },
    rejected: {
      type: String,
      default: '#FF0000'
    },
    implemented: {
      type: String,
      default: '#9932CC'
    },
    considered: {
      type: String,
      default: '#FFA500'
    }
  },
  anonymous: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('SuggestionSettings', suggestionSettingsSchema);