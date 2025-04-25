const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Display a user\'s avatar')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user whose avatar to show')
        .setRequired(false)),
  
  category: 'information',
  usage: '/avatar [user]',
  examples: ['/avatar', '/avatar @username'],
  aliases: ['av', 'pfp', 'icon'],
  
  /**
   * Execute the command - Slash Command
   * @param {*} interaction - The interaction object
   */
  async execute(interaction) {
    const user = interaction.options.getUser('user') || interaction.user;
    
    const embed = new EmbedBuilder()
      .setTitle(`${user.tag}'s Avatar`)
      .setDescription(`[PNG](${user.displayAvatarURL({ format: 'png', size: 4096 })}) | [JPG](${user.displayAvatarURL({ format: 'jpg', size: 4096 })}) | [WEBP](${user.displayAvatarURL({ format: 'webp', size: 4096 })})`)
      .setImage(user.displayAvatarURL({ dynamic: true, size: 4096 }))
      .setColor(interaction.guild.members.me.displayHexColor)
      .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  },
  
  /**
   * Execute the command - Legacy Command
   * @param {*} message - The message object
   * @param {string[]} args - The message arguments
   * @param {*} client - The client object
   */
  async run(message, args, client) {
    let user;
    
    if (message.mentions.users.first()) {
      user = message.mentions.users.first();
    } else if (args[0]) {
      try {
        user = await client.users.fetch(args[0]);
      } catch (error) {
        user = message.author;
      }
    } else {
      user = message.author;
    }
    
    const embed = new EmbedBuilder()
      .setTitle(`${user.tag}'s Avatar`)
      .setDescription(`[PNG](${user.displayAvatarURL({ format: 'png', size: 4096 })}) | [JPG](${user.displayAvatarURL({ format: 'jpg', size: 4096 })}) | [WEBP](${user.displayAvatarURL({ format: 'webp', size: 4096 })})`)
      .setImage(user.displayAvatarURL({ dynamic: true, size: 4096 }))
      .setColor(message.guild.members.me.displayHexColor)
      .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
      .setTimestamp();
    
    await message.channel.send({ embeds: [embed] });
  }
};