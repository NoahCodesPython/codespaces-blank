const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Guild = require('../../models/Guild');

module.exports = {
  name: 'prefix',
  description: 'View or change the server prefix',
  usage: 'prefix [new prefix]',
  category: 'config',
  cooldown: 10,
  aliases: ['setprefix', 'botprefix'],
  permissions: [PermissionFlagsBits.ManageGuild],
  
  // Slash command data
  data: new SlashCommandBuilder()
    .setName('prefix')
    .setDescription('View or change the server prefix')
    .addStringOption(option => 
      option.setName('new_prefix')
        .setDescription('The new prefix for the server')
        .setRequired(false)),
  
  // Execute slash command
  async execute(client, interaction) {
    await interaction.deferReply();
    
    const newPrefix = interaction.options.getString('new_prefix');
    
    // Get current guild settings
    let guildSettings = await Guild.findOne({ guildID: interaction.guild.id });
    
    // If no settings exist, create a new document
    if (!guildSettings) {
      guildSettings = new Guild({
        guildID: interaction.guild.id,
        prefix: client.config.prefix
      });
    }
    
    // If no new prefix is provided, show current prefix
    if (!newPrefix) {
      return interaction.editReply(`The current prefix for this server is \`${guildSettings.prefix || client.config.prefix}\``);
    }
    
    // Check if prefix is too long
    if (newPrefix.length > 5) {
      return interaction.editReply('The prefix cannot be longer than 5 characters.');
    }
    
    // Update prefix
    guildSettings.prefix = newPrefix;
    await guildSettings.save();
    
    // Send success message
    const embed = new EmbedBuilder()
      .setColor('#2ecc71')
      .setTitle('Prefix Updated')
      .setDescription(`The prefix for this server has been updated to \`${newPrefix}\``)
      .setFooter({ text: `Changed by ${interaction.user.tag}` })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
  },
  
  // Execute prefix command
  async run(client, message, args) {
    // Get new prefix from args
    const newPrefix = args[0];
    
    // Get current guild settings
    let guildSettings = await Guild.findOne({ guildID: message.guild.id });
    
    // If no settings exist, create a new document
    if (!guildSettings) {
      guildSettings = new Guild({
        guildID: message.guild.id,
        prefix: client.config.prefix
      });
    }
    
    // If no new prefix is provided, show current prefix
    if (!newPrefix) {
      return message.reply(`The current prefix for this server is \`${guildSettings.prefix || client.config.prefix}\``);
    }
    
    // Check if prefix is too long
    if (newPrefix.length > 5) {
      return message.reply('The prefix cannot be longer than 5 characters.');
    }
    
    // Update prefix
    guildSettings.prefix = newPrefix;
    await guildSettings.save();
    
    // Send success message
    const embed = new EmbedBuilder()
      .setColor('#2ecc71')
      .setTitle('Prefix Updated')
      .setDescription(`The prefix for this server has been updated to \`${newPrefix}\``)
      .setFooter({ text: `Changed by ${message.author.tag}` })
      .setTimestamp();
    
    await message.channel.send({ embeds: [embed] });
  }
};
