const mongoose = require('mongoose');
const Guild = require('../models/Guild');

(async () => {
  try {
    // Connect to the database
    await mongoose.connect('mongodb+srv://botlist:doraemon@cluster0.a2rt8g7.mongodb.net/', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to the database.');

    // Remove entries with null guildID
    const result = await Guild.deleteMany({ guildID: null });
    console.log(`Removed ${result.deletedCount} entries with null guildID.`);

    // Close the database connection
    await mongoose.connection.close();
    console.log('Database connection closed.');
  } catch (error) {
    console.error('Error cleaning the database:', error);
  }
})();
