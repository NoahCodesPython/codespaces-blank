const Command = require('../../structures/Command');
const request = require('request-promise-native');
const Guild = require('../../database/schemas/Guild');
const discord = require('discord.js');
const { Canvas, loadImage } = require("@napi-rs/canvas");
module.exports = class extends Command {
    constructor(...args) {
      super(...args, {
        name: 'pornhubcomment',
        aliases: [ 'phcomment', 'phubcomment' ],
        description: 'Make your own HUB text!',
        category: 'Images',
        usage: '<text>',
        examples: [ 'pornhub Hello there' ],
        cooldown: 5
      });
    }

    async run(message, args) {
      const client = message.client;
      const guildDB = await Guild.findOne({
        guildId: message.guild.id
      });
    
  
      const language = require(`../../data/language/${guildDB.language}.json`)

      let text = args.slice(0).join(" ")
      if(!text) return message.channel.send(new discord.MessageEmbed().setColor(client.color.red).setDescription(`${client.emoji.fail} ${language.changeErrorValid}`));
      
        if(text.length > 50) return message.channel.send(new discord.MessageEmbed().setColor(client.color.red).setDescription(`${client.emoji.fail} ${language.phubErrorCharacter}`));
    
        const canvas = new Canvas(800, 200);
        const ctx = canvas.getContext('2d');
        
        // Draw background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 800, 200);
        
        // Load and draw avatar
        const avatar = await loadImage(message.author.displayAvatarURL({ format: "png" }));
        ctx.drawImage(avatar, 20, 20, 50, 50);
        
        // Add text
        ctx.font = '20px Arial';
        ctx.fillStyle = '#F7971D';
        ctx.fillText(message.author.username, 80, 45);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(text, 20, 100);
        
        const buffer = await canvas.encode('png');
        message.channel.send({ files: [{attachment: buffer, name: "phub.png"}] });
    }
};