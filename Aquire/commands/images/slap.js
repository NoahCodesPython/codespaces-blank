const Command = require('../../structures/Command');
const fetch = require('node-fetch');
const Guild = require('../../database/schemas/Guild');
const discord = require('discord.js');
const { MessageAttachment } = require("discord.js")
const { createCanvas, loadImage } = require('@napi-rs/canvas');


module.exports = class extends Command {
    constructor(...args) {
      super(...args, {
        name: 'slap',
        description: 'slap a user!',
        category: 'Images',
        cooldown: 4
      });
    }

    async run(message, args) {

  const client = message.client
        const guildDB = await Guild.findOne({
            guildId: message.guild.id
          });

          const language = require(`../../data/language/${guildDB.language}.json`)

         try {
            const recipient = message.content.split(/\s+/g).slice(1).join(' '); 
           if (!recipient) {
                const member =  message.guild.me
                const mentionedMemberAvatar = member.user.displayAvatarURL({dynamic: false, format: "png"})
                const messageAuthorAvatar = message.author.displayAvatarURL({dynamic: false, format: "png"})

                const canvas = createCanvas(500, 500);
                const ctx = canvas.getContext('2d');

                const background = await loadImage('https://raw.githubusercontent.com/Androz2091/discord-canvas-templates/master/assets/slap.png');
                const targetAvatar = await loadImage(mentionedMemberAvatar);
                const authorAvatar = await loadImage(messageAuthorAvatar);

                ctx.drawImage(background, 0, 0, 500, 500);
                ctx.drawImage(authorAvatar, 300, 50, 100, 100);
                ctx.drawImage(targetAvatar, 100, 200, 100, 100);

                const buffer = await canvas.encode('png');
                message.channel.send({ files: [{ attachment: buffer, name: "slap.png" }] });

                }
                else if (message.mentions.users.first() == message.author) {


                const member =  this.client.user
                const mentionedMemberAvatar = member.user.displayAvatarURL({dynamic: false, format: "png"})
                const messageAuthorAvatar = message.author.displayAvatarURL({dynamic: false, format: "png"})

                const canvas = createCanvas(500, 500);
                const ctx = canvas.getContext('2d');

                const background = await loadImage('https://raw.githubusercontent.com/Androz2091/discord-canvas-templates/master/assets/slap.png');
                const targetAvatar = await loadImage(mentionedMemberAvatar);
                const authorAvatar = await loadImage(messageAuthorAvatar);

                ctx.drawImage(background, 0, 0, 500, 500);
                ctx.drawImage(authorAvatar, 300, 50, 100, 100);
                ctx.drawImage(targetAvatar, 100, 200, 100, 100);

                const buffer = await canvas.encode('png');
                message.channel.send({ files: [{ attachment: buffer, name: "slap.png" }] });
                }

                else {
                let member = message.mentions.members.last();


     if(!member) {

      try {

       member = await message.guild.members.fetch(args[0])

     } catch {

member = message.member;

     }



       }
                const mentionedMemberAvatar = member.displayAvatarURL({dynamic: false, format: "png"})
                const messageAuthorAvatar = message.author.displayAvatarURL({dynamic: false, format: "png"})

                const canvas = createCanvas(500, 500);
                const ctx = canvas.getContext('2d');

                const background = await loadImage('https://raw.githubusercontent.com/Androz2091/discord-canvas-templates/master/assets/slap.png');
                const targetAvatar = await loadImage(mentionedMemberAvatar);
                const authorAvatar = await loadImage(messageAuthorAvatar);

                ctx.drawImage(background, 0, 0, 500, 500);
                ctx.drawImage(authorAvatar, 300, 50, 100, 100);
                ctx.drawImage(targetAvatar, 100, 200, 100, 100);

                const buffer = await canvas.encode('png');
                message.channel.send({ files: [{ attachment: buffer, name: "slap.png" }] });

            }

                } catch (err) {
           message.channel.send(new discord.MessageEmbed().setColor(client.color.blue).setDescription(language.slapError))
              };



    }
};