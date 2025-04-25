const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  userID: {
    type: String,
    required: true,
    unique: true
  },
  isPremium: {
    type: Boolean,
    default: false
  },
  premiumUntil: {
    type: Date,
    default: null
  },
  blacklisted: {
    type: Boolean,
    default: false
  },
  blacklistReason: {
    type: String,
    default: null
  },
  warnings: {
    type: Array,
    default: []
  },
  economy: {
    wallet: {
      type: Number,
      default: 0
    },
    bank: {
      type: Number,
      default: 0
    },
    lastDaily: {
      type: Date,
      default: null
    },
    lastWork: {
      type: Date,
      default: null
    },
    inventory: {
      type: Array,
      default: []
    }
  },
  xp: {
    type: Map,
    of: {
      level: {
        type: Number,
        default: 1
      },
      xp: {
        type: Number,
        default: 0
      },
      totalXP: {
        type: Number,
        default: 0
      }
    },
    default: new Map()
  },
  commandsUsed: {
    type: Number,
    default: 0
  },
  lastCommand: {
    type: Date,
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
