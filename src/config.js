module.exports = {
  // Default bot settings
  prefix: '!',
  defaultEmbed: {
    color: '#3498db',
    footer: 'Aquire Bot'
  },
  
  // Default permissions
  permissions: {
    // Default required permissions for using the bot
    bot: [
      'SendMessages',
      'EmbedLinks',
      'AttachFiles',
      'UseExternalEmojis',
      'AddReactions',
      'ReadMessageHistory'
    ],
    
    // Default required permissions for server administrators
    admin: [
      'Administrator',
      'ManageGuild'
    ]
  },
  
  // Primary bot owner ID
  ownerID: '-1354494701104926760',
  
  // User IDs with bot owner permissions
  ownerIds: ['-1354494701104926760'],
  
  // Owner name
  ownerName: 'Noah Osmont',
  
  // Webhooks for logging (add your webhook URLs as needed)
  webhooks: {
    logs: '',
    errors: '',
    joins: ''
  },
  
  // Colors for embeds
  colors: {
    main: '#3498db',
    success: '#2ecc71',
    warning: '#f1c40f',
    error: '#e74c3c',
    info: '#7289da'
  },
  
  // Emoji IDs for the bot
  emojis: {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
    loading: '🔄'
  },
  
  // Feature toggles
  features: {
    leveling: true,
    economy: true,
    moderation: true,
    music: false,
    tickets: true,
    suggestions: true,
    altDetection: true
  }
};