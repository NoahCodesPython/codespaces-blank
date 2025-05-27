const { Events, AttachmentBuilder } = require('discord.js');

const { registerFont } = require('canvas');

const AltDetector = require('../../models/AltDetector');

const Guild = require('../../models/Guild');

const logger = require('../../utils/logger');

const ms = require('ms');

const axios = require('axios');

const path = require('path');

const fs = require('fs');

const { generateWelcomeGif } = require('../../utils/generateWelcomeGif');


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

      const gifBuffer = await generateWelcomeGif(
        member.user,
        member.guild,
        guildSettings.welcomeMessage,
        guildSettings.welcomeBackground || 'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExZnk1NG1uMnF5NHNnZDUwZzNrdHQ0ejNwdmhvZ25jN2Y1NmNha2FnciZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/cKztHK8yKmSrjjPyAg/giphy.gif'
      );

      const attachment = new AttachmentBuilder(gifBuffer, { name: 'welcome.gif' });

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