const mongoose = require('mongoose');

// Alt Detector Config (Per Guild)
const AltDetectorSchema = new mongoose.Schema({
  guildID: {
    type: String,
    required: true,
    unique: true
  },
  altDays: {
    type: String, 
    default: '7'
  },
  altModlog: {
    type: String, 
    default: null
  },
  allowedAlts: {
    type: Array, 
    default: []
  },
  altAction: {
    type: String, 
    default: 'none'
  },
  altToggle: {
    type: Boolean, 
    default: false
  },
  notifier: {
    type: Boolean, 
    default: false
  }
});

// Alt Accounts (Per User)
const AltAccountSchema = new mongoose.Schema({
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

// Composite unique index on guildID and userID for alt accounts
AltAccountSchema.index({ guildID: 1, userID: 1 }, { unique: true });

const AltDetector = mongoose.model('AltDetector', AltDetectorSchema);
const AltAccount = mongoose.model('AltAccount', AltAccountSchema);

module.exports = {
  AltDetector,
  AltAccount
};
