const mongoose = require('mongoose');

const ticketSettingsSchema = new mongoose.Schema({
  guildID: { 
    type: String, 
    required: true 
  },
  enabled: { 
    type: Boolean, 
    default: false 
  },
  supportRole: { 
    type: String, 
    default: null 
  },
  category: { 
    type: String, 
    default: null 
  },
  transcriptChannel: { 
    type: String, 
    default: null 
  },
  ticketChannel: { 
    type: String, 
    default: null 
  },
  ticketMessage: { 
    type: String, 
    default: null 
  },
  ticketWelcomeMessage: { 
    type: String, 
    default: "Thanks for creating a ticket! Support staff will be with you shortly." 
  },
  ticketDescription: { 
    type: String, 
    default: "Click the button below to create a support ticket." 
  },
  buttonEmoji: { 
    type: String, 
    default: "🎫" 
  },
  buttonColor: { 
    type: String, 
    default: "Primary" // Primary, Secondary, Success, Danger
  },
  buttonLabel: { 
    type: String, 
    default: "Create Ticket" 
  },
  useThreads: { 
    type: Boolean, 
    default: false 
  },
  userTicketLimit: { 
    type: Number, 
    default: 1 
  },
  ticketCount: { 
    type: Number, 
    default: 0 
  },
  ticketSupporters: [{ 
    type: String 
  }],
  ticketLogs: { 
    type: String, 
    default: null 
  }
});

module.exports = mongoose.model('TicketSettings', ticketSettingsSchema);