const mongoose = require('mongoose');

const reactionRoleSchema = new mongoose.Schema({
  messageID: { type: String, required: true },
  channelID: { type: String, required: true },
  guildID: { type: String, required: true },
  reactions: [{
    emoji: { type: String, required: true },
    roleID: { type: String, required: true },
    roleDescription: { type: String, default: '' }
  }],
  // Type could be 'normal', 'unique', 'verification'
  // normal: Can have multiple roles
  // unique: Can only have one role from this message (removes other roles when a new one is selected)
  // verification: Acts as a verification system, one-time role assignment
  type: { type: String, default: 'normal', enum: ['normal', 'unique', 'verification'] }
});

module.exports = mongoose.model('ReactionRole', reactionRoleSchema);