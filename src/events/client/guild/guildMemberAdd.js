const { generateWelcomeGif } = require('../../../utils/generateWelcomeGif');
const { AttachmentBuilder } = require('discord.js');
const Guild = require('../../../models/Guild');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member) {
        const guild = member.guild;
        const user = member.user;

        // Fetch guild settings
        let data = await Guild.findOne({ guildID: guild.id });
        if (!data || !data.welcomeEnabled) return; // Exit if welcome is not enabled

        const channel = guild.channels.cache.get(data.welcomeChannel);
        if (!channel) return; // Exit if the channel is missing or deleted

        // Generate welcome GIF
        const gifBuffer = await generateWelcomeGif(
            user,
            guild,
            data.welcomeMessage,
            data.welcomeBackground || 'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExZnk1NG1uMnF5NHNnZDUwZzNrdHQ0ejNwdmhvZ25jN2Y1NmNha2FnciZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/cKztHK8yKmSrjjPyAg/giphy.gif'
        );

        const attachment = new AttachmentBuilder(gifBuffer, { name: 'welcome.gif' });

        const welcomeText = data.welcomeMessage
            .replace('{user}', `<@${user.id}>`)
            .replace('{server}', guild.name);

        // Send welcome message
        await channel.send({ content: welcomeText, files: [attachment] });
    },
};