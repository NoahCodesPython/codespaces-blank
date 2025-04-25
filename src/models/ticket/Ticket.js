const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  guildID: { 
    type: String, 
    required: true 
  },
  channelID: { 
    type: String, 
    required: true 
  },
  ticketID: { 
    type: String, 
    required: true 
  },
  creatorID: { 
    type: String, 
    required: true 
  },
  ticketNumber: { 
    type: Number, 
    required: true 
  },
  topic: { 
    type: String, 
    default: 'No topic provided' 
  },
  status: { 
    type: String, 
    enum: ['open', 'closed', 'archived', 'deleted'], 
    default: 'open' 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  closedAt: { 
    type: Date, 
    default: null 
  },
  closedBy: { 
    type: String, 
    default: null 
  },
  isThread: {
    type: Boolean,
    default: false
  },
  transcriptURL: {
    type: String,
    default: null
  },
  participants: [{
    type: String
  }]
});

module.exports = mongoose.model('Ticket', ticketSchema);