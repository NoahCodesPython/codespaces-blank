const { Events, AttachmentBuilder } = require('discord.js');

const { createCanvas, loadImage, registerFont } = require('canvas');

const GIFEncoder = require('gif-encoder-2');

const AltDetector = require('../../models/AltDetector');

const Guild = require('../../models/Guild');

const logger = require('../../utils/logger');

const ms = require('ms');

const axios = require('axios');

const path = require('path');

const fs = require('fs');

// Register font

registerFont(path.join(__dirname, '../../../assets/fonts/SpaceMono-Regular.ttf'), { family:'Space Mono' });

module.exports = {

  name: Events.GuildMemberAdd,

  async execute(member) {

    try {

      if (member.user.bot) return;

      const guildSettings = await Guild.findOne({ guildID: member.guild.id });

      if (!guildSettings) return;

      // ALT DETECTOR LOGIC

      const altSettings = await AltDetector.findOne({ guildID: member.guild.id });

      if (altSettings && altSettings.altToggle) {

        const accountAge = Date.now() - member.user.createdAt;

        const minAge = altSettings.time;

        if (accountAge < minAge && (!altSettings.whitelisted || !altSettings.whitelisted.includes(member.id))) {

          const logChannel = member.guild.channels.cache.get(altSettings.logChannel);

          if (altSettings.action === 'kick' && member.kickable) {

            await member.kick(`Alt detected - Account age: ${ms(accountAge)}`);

          } else if (altSettings.action === 'ban' && member.bannable) {

            await member.ban({ reason: `Alt detected - Account age: ${ms(accountAge)}` });

          }

          if (logChannel) {

            await logChannel.send({

              content: `⚠️ Alt account detected: ${member.user.tag} (${member.id}) - Age: ${ms(accountAge)}`

            });

          }

          return;

        }

      }

      // WELCOME GIF LOGIC

      if (!guildSettings.welcomeEnabled || !guildSettings.welcomeChannel) return;

      const welcomeChannel = member.guild.channels.cache.get(guildSettings.welcomeChannel);

      if (!welcomeChannel) return;

      const canvasWidth = 800;

      const canvasHeight = 250;

      const encoder = new GIFEncoder(canvasWidth, canvasHeight);

      encoder.setDelay(100);

      encoder.setRepeat(0);

      encoder.start();

      const canvas = createCanvas(canvasWidth, canvasHeight);

      const ctx = canvas.getContext('2d');

      const backgroundUrl = guildSettings.welcomeBackground || 'https://i.imgur.com/zvWTUVu.jpg';

      const bgImage = await loadImage((await axios.get(backgroundUrl, { responseType: 'arraybuffer' })).data);

      const avatarImage = await loadImage(member.user.displayAvatarURL({ extension: 'png', size: 128 }));

      const frames = 10;

      for (let i = 0; i < frames; i++) {

        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        ctx.drawImage(bgImage, 0, 0, canvasWidth, canvasHeight);

        // Glowing Avatar effect

        ctx.save();

        ctx.beginPath();

        ctx.arc(125, 125, 60, 0, Math.PI * 2);

        ctx.closePath();

        ctx.clip();

        ctx.drawImage(avatarImage, 65, 65, 120, 120);

        ctx.restore();

        // Wavy Welcome Text

        const wave = Math.sin(i * 0.5) * 5;

        ctx.font = 'bold 36px "Open Sans"';

        ctx.fillStyle = '#ffffff';

        ctx.fillText(`Welcome ${member.user.username}`, 220, 120 + wave);

        ctx.font = '28px "Open Sans"';

        ctx.fillStyle = '#dddddd';

        ctx.fillText(`to ${member.guild.name}!`, 220, 170 - wave);

        encoder.addFrame(ctx);

      }

      encoder.finish();

      const buffer = encoder.out.getData();

      const attachment = new AttachmentBuilder(buffer, { name: 'welcome.gif' });

      const message = guildSettings.welcomeMessage

        .replace('{user}', `<@${member.id}>`)

        .replace('{server}', member.guild.name);

      await welcomeChannel.send({

        content: message,

        files: [attachment],

      });

    } catch (error) {

      logger.error(`Error in guildMemberAdd: ${error}`);

    }

  }

};