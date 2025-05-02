// commands/utility/welcome.js

const { SlashCommandBuilder, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');

const Guild = require('../../models/Guild');

const { generateWelcomeGif } = require('../../utils/generateWelcomeGif');

module.exports = {

  data: new SlashCommandBuilder()

    .setName('welcome')

    .setDescription('Manage welcome settings')

    .addSubcommand(subcommand =>

      subcommand.setName('set')

        .setDescription('Set the welcome channel, message, and background GIF')

        .addChannelOption(option =>

          option.setName('channel')

            .setDescription('Channel to send welcome message')

            .setRequired(true))

        .addStringOption(option =>

          option.setName('message')

            .setDescription('Custom welcome message. Use {user} and {server}')

            .setRequired(true))

        .addStringOption(option =>

          option.setName('background')

            .setDescription('Link to a background GIF image')

            .setRequired(false)))

    .addSubcommand(subcommand =>

      subcommand.setName('disable')

        .setDescription('Disable welcome messages'))

    .addSubcommand(subcommand =>

      subcommand.setName('view')

        .setDescription('View current welcome settings'))

    .addSubcommand(subcommand =>

      subcommand.setName('test')

        .setDescription('Test the welcome message on yourself'))

    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction, client) {

    const { options, guild, user } = interaction;

    const sub = options.getSubcommand();

    await interaction.deferReply({ ephemeral: true });

    let data = await Guild.findOne({ guildID: guild.id });

    if (!data) data = await Guild.create({ guildID: guild.id });

    if (sub === 'set') {

      const channel = options.getChannel('channel');

      const message = options.getString('message');

      const background = options.getString('background') || null;

      data.welcomeChannel = channel.id;

      data.welcomeMessage = message;

      data.welcomeBackground = background;

      data.welcomeEnabled = true;

      await data.save();

      return interaction.editReply({

        content: `✅ Welcome system updated!\nChannel: ${channel}\nMessage: ${message}\nBackground: ${background || 'Default'}`

      });

    } else if (sub === 'disable') {

      data.welcomeEnabled = false;

      await data.save();

      return interaction.editReply({ content: '❌ Welcome system disabled.' });

    } else if (sub === 'view') {

      if (!data.welcomeEnabled) {

        return interaction.editReply({ content: '⚠️ Welcome system is not enabled.' });

      }

      const channel = guild.channels.cache.get(data.welcomeChannel);

      return interaction.editReply({

        content: `**Welcome Settings:**\nChannel: ${channel}\nMessage: ${data.welcomeMessage}\nBackground: ${data.welcomeBackground || 'Default'}`

      });

    } else if (sub === 'test') {

      if (!data.welcomeEnabled) {

        return interaction.editReply({ content: '⚠️ Welcome system is not enabled.' });

      }

      const channel = guild.channels.cache.get(data.welcomeChannel);

      if (!channel) {

        return interaction.editReply({ content: '⚠️ The welcome channel is missing or deleted.' });

      }

      const stream = await generateWelcomeGif({

        username: user.username,

        avatarUrl: user.displayAvatarURL({ extension: 'png', size: 512 }),

        backgroundUrl: data.welcomeBackground || 'https://media.tenor.com/nG8mRUjHvhoAAAAC/galaxy.gif',

      });

      const attachment = new AttachmentBuilder(stream, { name: 'welcome.gif' });

      const welcomeText = data.welcomeMessage

        .replace('{user}', `<@${user.id}>`)

        .replace('{server}', guild.name);

      await channel.send({ content: welcomeText, files: [attachment] });

      return interaction.editReply({ content: '✅ Sent a test welcome message!' });

    }

  },

};