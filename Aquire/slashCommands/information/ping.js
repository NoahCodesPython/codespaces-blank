
const SlashCommand = require('../../structures/SlashCommand');

module.exports = class extends SlashCommand {
    constructor(...args) {
        super(...args, {
            name: 'ping',
            description: 'Check bot latency',
            category: 'Information'
        });
    }

    async execute(interaction) {
        const msg = await interaction.reply({ content: 'Pinging...', fetchReply: true });
        const latency = msg.createdTimestamp - interaction.createdTimestamp;
        
        await interaction.editReply({
            content: `Bot Latency: \`${latency}ms\`\nWebSocket Latency: \`${Math.round(this.client.ws.ping)}ms\``
        });
    }
};
