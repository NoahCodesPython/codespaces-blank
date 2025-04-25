const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../../utils/logger');

// 8ball responses
const responses = [
  '🟢 It is certain.',
  '🟢 It is decidedly so.',
  '🟢 Without a doubt.',
  '🟢 Yes definitely.',
  '🟢 You may rely on it.',
  '🟢 As I see it, yes.',
  '🟢 Most likely.',
  '🟢 Outlook good.',
  '🟢 Yes.',
  '🟢 Signs point to yes.',
  '🟡 Reply hazy, try again.',
  '🟡 Ask again later.',
  '🟡 Better not tell you now.',
  '🟡 Cannot predict now.',
  '🟡 Concentrate and ask again.',
  '🔴 Don\'t count on it.',
  '🔴 My reply is no.',
  '🔴 My sources say no.',
  '🔴 Outlook not so good.',
  '🔴 Very doubtful.'
];

module.exports = {
  name: '8ball',
  description: 'Ask the magic 8-ball a question',
  category: 'fun',
  aliases: ['8b', 'magic8'],
  usage: '<question>',
  examples: ['8ball Will I win the lottery?', '8ball Is today my lucky day?'],
  userPermissions: [],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('Ask the magic 8-ball a question')
    .addStringOption(option => 
      option.setName('question')
        .setDescription('The question to ask the magic 8-ball')
        .setRequired(true)),
  
  // Slash command execution
  async execute(interaction) {
    try {
      const question = interaction.options.getString('question');
      
      // Get a random response
      const response = responses[Math.floor(Math.random() * responses.length)];
      
      // Determine color based on response
      let color;
      if (response.startsWith('🟢')) {
        color = '#00FF00'; // Green for positive
      } else if (response.startsWith('🟡')) {
        color = '#FFFF00'; // Yellow for neutral
      } else {
        color = '#FF0000'; // Red for negative
      }
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle('🎱 Magic 8-Ball')
        .setDescription(`**Question:** ${question}\n\n**Answer:** ${response}`)
        .setColor(color)
        .setFooter({ text: `Asked by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing 8ball command: ${error}`);
      await interaction.reply({ 
        content: 'There was an error executing this command!', 
        ephemeral: true 
      });
    }
  },
  
  // Legacy command execution
  async run(client, message, args) {
    try {
      // Check if a question was provided
      if (!args.length) {
        return message.reply('You need to ask the 8-ball a question!');
      }
      
      const question = args.join(' ');
      
      // Get a random response
      const response = responses[Math.floor(Math.random() * responses.length)];
      
      // Determine color based on response
      let color;
      if (response.startsWith('🟢')) {
        color = '#00FF00'; // Green for positive
      } else if (response.startsWith('🟡')) {
        color = '#FFFF00'; // Yellow for neutral
      } else {
        color = '#FF0000'; // Red for negative
      }
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle('🎱 Magic 8-Ball')
        .setDescription(`**Question:** ${question}\n\n**Answer:** ${response}`)
        .setColor(color)
        .setFooter({ text: `Asked by ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      
      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error executing 8ball command: ${error}`);
      message.reply('There was an error executing this command!');
    }
  }
};