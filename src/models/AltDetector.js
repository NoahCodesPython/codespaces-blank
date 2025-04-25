const mongoose = require('mongoose');

const AltSchema = new mongoose.Schema({
  guildID: {
    type: String,
    required: true
  },
  userID: {
    type: String,
    required: true
  },
  accountCreationDate: {
    type: Date,
    required: true
  },
  joinDate: {
    type: Date,
    required: true
  },
  avatarURL: {
    type: String,
    default: null
  },
  accountAge: {
    type: Number,
    required: true
  },
  isAlt: {
    type: Boolean,
    default: false
  },
  actionTaken: {
    type: String,
    enum: ['none', 'kick', 'ban'],
    default: 'none'
  },
  altReason: {
    type: String,
    default: 'Account age below threshold'
  }
}, { timestamps: true });

// Composite unique index on guildID and userID
AltSchema.index({ guildID: 1, userID: 1 }, { unique: true });

module.exports = mongoose.model('AltDetector', AltSchema);
