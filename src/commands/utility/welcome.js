// commands/utility/welcome.js

const { SlashCommandBuilder, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');

const Guild = require('../../models/Guild');

const { generateWelcomeGif } = require('../../utils/generateWelcomeGif');

module.exports = {

  data: new SlashCommandBuilder()

    .setName('welcome')

    .setDescription('Configure welcome messages and settings for new members')

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

    await interaction.deferReply({ flags: 64 }); // Use flags instead of ephemeral

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

      const gifBuffer = await generateWelcomeGif(
        user, // Pass the user object directly
        guild,
        data.welcomeMessage,
        data.welcomeBackground || 'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExZnk1NG1uMnF5NHNnZDUwZzNrdHQ0ejNwdmhvZ25jN2Y1NmNha2FnciZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/cKztHK8yKmSrjjPyAg/giphy.gif'
      );

      const attachment = new AttachmentBuilder(gifBuffer, { name: 'welcome.gif' });

      const welcomeText = data.welcomeMessage
        .replace('{user}', `<@${user.id}>`)
        .replace('{server}', guild.name);

      await channel.send({ content: welcomeText, files: [attachment] });

      return interaction.editReply({ content: '✅ Sent a test welcome message!' });

    }

  },

};