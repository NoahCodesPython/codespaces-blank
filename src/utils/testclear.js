const mongoose = require('mongoose');
const Guild = require('../models/Guild');

(async () => {
    try {
        // Connect to the database
        await mongoose.connect('mongodb+srv://botlist:doraemon@cluster0.a2rt8g7.mongodb.net/');

        console.log('Connected to the database.');

        // Find and delete entries with null or invalid guildID
        const result = await Guild.deleteMany({
            $or: [
                { guildID: null },
                { guildID: 'null' },
                { guildID: '' },
                { guildID: { $exists: false } }
            ]
        });

        console.log(`Deleted ${result.deletedCount} invalid entries.`);

        // Log remaining entries for verification
        const remainingEntries = await Guild.find({});
        console.log('Remaining entries:', remainingEntries);

        // Check and log indexes of the guilds collection
        const indexes = await Guild.collection.getIndexes();
        console.log('Indexes on the guilds collection:', indexes);

        // Drop the old guildId_1 index if it exists
        if (indexes['guildId_1']) {
            await Guild.collection.dropIndex('guildId_1');
            console.log('Dropped the old guildId_1 index.');
        }

        // Close the database connection
        await mongoose.connection.close();
        console.log('Database connection closed.');
    } catch (error) {
        console.error('Error during cleanup:', error);
        process.exit(1);
    }
})();
