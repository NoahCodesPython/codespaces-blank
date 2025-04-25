
const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = class SlashCommand {
    constructor(client, name, options = {}) {
        this.client = client;
        this.name = options.name || name;
        this.description = options.description || "No description provided.";
        this.category = options.category || "General";
        this.permissions = options.permissions || [];
        this.data = new SlashCommandBuilder()
            .setName(this.name.toLowerCase())
            .setDescription(this.description);
    }

    // eslint-disable-next-line no-unused-vars
    async execute(interaction) {
        throw new Error(`The execute method has not been implemented in ${this.name}`);
    }
}
