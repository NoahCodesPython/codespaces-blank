
const Event = require('../../structures/Event');

module.exports = class extends Event {
    async run(interaction) {
        if (!interaction.isCommand()) return;

        const command = this.client.slashCommands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            await interaction.reply({ 
                content: 'There was an error executing this command!',
                ephemeral: true 
            }).catch(() => {});
        }
    }
};
