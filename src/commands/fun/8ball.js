const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  name: '8ball',
  description: 'Ask the magic 8ball a question',
  usage: '8ball <question>',
  category: 'fun',
  cooldown: 5,
  aliases: ['8b', 'magic8'],
  
  // Slash command data
  data: new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('Ask the magic 8ball a question')
    .addStringOption(option => 
      option.setName('question')
        .setDescription('The question to ask the 8ball')
        .setRequired(true)),
  
  // Execute slash command
  async execute(client, interaction) {
    const question = interaction.options.getString('question');
    
    // Get a random answer
    const answer = getRandomAnswer();
    
    // Create embed
    const embed = new EmbedBuilder()
      .setColor('#3498db')
      .setTitle('🎱 Magic 8Ball')
      .addFields(
        { name: 'Question', value: question },
        { name: 'Answer', value: answer }
      )
      .setFooter({ text: `Asked by ${interaction.user.tag}` })
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  },
  
  // Execute prefix command
  async run(client, message, args) {
    // Check if question is provided
    if (!args.length) {
      return message.reply(`Please ask a question. Usage: \`${client.config.prefix}${this.usage}\``);
    }
    
    const question = args.join(' ');
    
    // Get a random answer
    const answer = getRandomAnswer();
    
    // Create embed
    const embed = new EmbedBuilder()
      .setColor('#3498db')
      .setTitle('🎱 Magic 8Ball')
      .addFields(
        { name: 'Question', value: question },
        { name: 'Answer', value: answer }
      )
      .setFooter({ text: `Asked by ${message.author.tag}` })
      .setTimestamp();
    
    await message.channel.send({ embeds: [embed] });
  }
};

/**
 * Get a random 8ball answer
 */
function getRandomAnswer() {
  const answers = [
    // Affirmative answers
    'It is certain.',
    'It is decidedly so.',
    'Without a doubt.',
    'Yes – definitely.',
    'You may rely on it.',
    'As I see it, yes.',
    'Most likely.',
    'Outlook good.',
    'Yes.',
    'Signs point to yes.',
    
    // Non-committal answers
    'Reply hazy, try again.',
    'Ask again later.',
    'Better not tell you now.',
    'Cannot predict now.',
    'Concentrate and ask again.',
    
    // Negative answers
    'Don\'t count on it.',
    'My reply is no.',
    'My sources say no.',
    'Outlook not so good.',
    'Very doubtful.'
  ];
  
  return answers[Math.floor(Math.random() * answers.length)];
}
