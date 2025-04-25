const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config');
const logger = require('../../utils/logger');

module.exports = {
  name: 'invite',
  description: 'Get an invite link for the bot',
  category: 'utility',
  aliases: ['botinvite', 'addbot'],
  usage: '',
  examples: ['invite'],
  userPermissions: [],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('invite')
    .setDescription('Get an invite link for the bot'),
  
  // Slash command execution
  async execute(interaction) {
    try {
      // Create the invite link with appropriate permissions
      const inviteLink = `https://discord.com/api/oauth2/authorize?client_id=${interaction.client.user.id}&permissions=8&scope=bot%20applications.commands`;
      
      // Create an embed
      const embed = new EmbedBuilder()
        .setTitle('Invite Aquire to Your Server')
        .setDescription('Click the button below to add Aquire to your Discord server.')
        .setColor('#5865F2')
        .setThumbnail(interaction.client.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: 'Support Server', value: config.supportServer || 'Coming soon!', inline: true },
          { name: 'Created By', value: config.ownerTag || 'The Aquire Team', inline: true }
        )
        .setFooter({ text: 'Thanks for using Aquire!' })
        .setTimestamp();
      
      // Create a button for the invite link
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setLabel('Invite Bot')
            .setURL(inviteLink)
            .setStyle(ButtonStyle.Link),
          new ButtonBuilder()
            .setLabel('Support Server')
            .setURL(config.supportServer || 'https://discord.gg/')
            .setStyle(ButtonStyle.Link)
            .setDisabled(!config.supportServer)
        );
      
      // Send the embed with the button
      await interaction.reply({ embeds: [embed], components: [row] });
      
    } catch (error) {
      logger.error(`Error in invite command: ${error}`);
      interaction.reply({ 
        content: 'There was an error executing this command!', 
        ephemeral: true 
      });
    }
  },
  
  // Legacy command execution
  async run(client, message, args) {
    try {
      // Create the invite link with appropriate permissions
      const inviteLink = `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`;
      
      // Create an embed
      const embed = new EmbedBuilder()
        .setTitle('Invite Aquire to Your Server')
        .setDescription('Click the button below to add Aquire to your Discord server.')
        .setColor('#5865F2')
        .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: 'Support Server', value: config.supportServer || 'Coming soon!', inline: true },
          { name: 'Created By', value: config.ownerTag || 'The Aquire Team', inline: true }
        )
        .setFooter({ text: 'Thanks for using Aquire!' })
        .setTimestamp();
      
      // Create a button for the invite link
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setLabel('Invite Bot')
            .setURL(inviteLink)
            .setStyle(ButtonStyle.Link),
          new ButtonBuilder()
            .setLabel('Support Server')
            .setURL(config.supportServer || 'https://discord.gg/')
            .setStyle(ButtonStyle.Link)
            .setDisabled(!config.supportServer)
        );
      
      // Send the embed with the button
      await message.reply({ embeds: [embed], components: [row] });
      
    } catch (error) {
      logger.error(`Error in legacy invite command: ${error}`);
      message.reply('There was an error executing this command!');
    }
  }
};