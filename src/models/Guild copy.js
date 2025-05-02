const mongoose = require('mongoose');

const GuildSchema = new mongoose.Schema({
  guildID: {
    type: String,
    required: true,
    unique: true,
  },
  prefix: {
    type: String,
    default: '!',
  },
  premium: {
    type: Boolean,
    default: false,
  },
  premiumUntil: {
    type: Date,
    default: null,
  },
  welcomeChannel: {
    type: String,
    default: null,
  },
  welcomeMessage: {
    type: String,
    default: 'Welcome {user} to {server}!',
  },
  welcomeBackground: { // Change from welcomeGif to welcomeBackground
    type: String,
    default: null,
  },
  welcomeEnabled: {
    type: Boolean,
    default: false,
  },
  leaveChannel: {
    type: String,
    default: null,
  },
  leaveMessage: {
    type: String,
    default: '{user} has left the server!',
  },
  leaveEnabled: {
    type: Boolean,
    default: false,
  },
  leaveEmbed: {
    title: {
      type: String,
      default: 'Goodbye!',
    },
    description: {
      type: String,
      default: '{user} has left the server!',
    },
    color: {
      type: String,
      default: '#e74c3c',
    },
    timestamp: {
      type: Boolean,
      default: true,
    },
    footer: {
      type: String,
      default: '',
    },
    enabled: {
      type: Boolean,
      default: false,
    },
  },
  modLogChannel: {
    type: String,
    default: null,
  },
  modLogEnabled: {
    type: Boolean,
    default: false,
  },
  autoModEnabled: {
    type: Boolean,
    default: false,
  },
  autoModSettings: {
    inviteLinks: {
      type: Boolean,
      default: false,
    },
    massEmojis: {
      type: Boolean,
      default: false,
    },
    massMentions: {
      type: Boolean,
      default: false,
    },
    caps: {
      type: Boolean,
      default: false,
    },
    links: {
      type: Boolean,
      default: false,
    },
    exemptChannels: {
      type: [String],
      default: [],
    },
    exemptRoles: {
      type: [String],
      default: [],
    },
  },
  suggestionChannel: {
    type: String,
    default: null,
  },
  suggestionEnabled: {
    type: Boolean,
    default: false,
  },
  reportChannel: {
    type: String,
    default: null,
  },
  reportEnabled: {
    type: Boolean,
    default: false,
  },
  ticketCategory: {
    type: String,
    default: null,
  },
  ticketEnabled: {
    type: Boolean,
    default: false,
  },
  ticketMessage: {
    type: String,
    default: 'Thanks for creating a ticket! Support will be with you shortly.',
  },
  ticketSupportRole: {
    type: String,
    default: null,
  },
  levelingEnabled: {
    type: Boolean,
    default: false,
  },
  levelMessages: {
    type: Boolean,
    default: false,
  },
  levelChannel: {
    type: String,
    default: null,
  },
  disabledCommands: {
    type: [String],
    default: [],
  },
  altDetectorEnabled: {
    type: Boolean,
    default: false,
  },
  altDetectorAction: {
    type: String,
    enum: ['none', 'kick', 'ban'],
    default: 'none',
  },
  altDetectorThreshold: {
    type: Number,
    default: 7,
  },
}, { timestamps: true });

module.exports = mongoose.model('Guild', GuildSchema);
