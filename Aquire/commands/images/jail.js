
const Command = require('../../structures/Command');
const { Canvas } = require('@napi-rs/canvas');
const discord = require('discord.js');

module.exports = class extends Command {
    constructor(...args) {
      super(...args, {
        name: 'jail',
        description: 'Send Someone to jail!',
        category: 'Images',
        cooldown: 5
      });
    }

    async run(message, args) {
      const client = message.client;
      let user = message.mentions.users.first() || client.users.cache.get(args[0]) || match(args.join(" ").toLowerCase(), message.guild) || message.author;
      
      try {
        const canvas = new Canvas(400, 400);
        const ctx = canvas.getContext('2d');

        // Load avatar
        const avatar = await Canvas.loadImage(user.displayAvatarURL({ format: 'png' }));
        
        // Draw avatar
        ctx.drawImage(avatar, 0, 0, 400, 400);

        // Add jail bars effect
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, 400, 400);

        // Convert to buffer
        const buffer = await canvas.encode('png');
        
        // Send the image
        const attachment = new discord.MessageAttachment(buffer, 'jail.png');
        message.channel.send(attachment);

      } catch(error) {
        this.client.emit("apiError", error, message);
      }
    }
};

function match(msg, i) {
  if (!msg) return undefined;
  if (!i) return undefined;
  let user = i.members.cache.find(
    m =>
      m.user.username.toLowerCase().startsWith(msg) ||
      m.user.username.toLowerCase() === msg ||
      m.user.username.toLowerCase().includes(msg) ||
      m.displayName.toLowerCase().startsWith(msg) ||
      m.displayName.toLowerCase() === msg ||
      m.displayName.toLowerCase().includes(msg)
  );
  if (!user) return undefined;
  return user.user;
}
