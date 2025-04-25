const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getChatCompletion } = require('../../utils/openai');
const logger = require('../../utils/logger');
const { isOwner } = require('../../utils/ownerCheck');

module.exports = {
  name: 'ask',
  description: 'Ask a question to the AI assistant',
  category: 'utility',
  cooldown: 30, // 30 second cooldown
  usage: '<question>',
  examples: [
    'ask How does photosynthesis work?',
    'ask What are the major events of World War II?',
    'ask Can you recommend some exercises for beginners?'
  ],
  
  data: new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Ask a question to the AI assistant')
    .addStringOption(option => 
      option
        .setName('question')
        .setDescription('The question you want to ask')
        .setRequired(true)
    ),
  
  async execute(interaction) {
    const question = interaction.options.getString('question');
    
    // Defer the reply due to potentially long processing time
    await interaction.deferReply();
    
    try {
      logger.info(`User ${interaction.user.tag} (${interaction.user.id}) asked: "${question.substring(0, 50)}${question.length > 50 ? '...' : ''}"`);
      
      // Check if the user is an owner to customize the system prompt
      const isUserOwner = await isOwner(interaction.user.id);
      
      // Prepare system message based on user permissions
      const systemMessage = isUserOwner
        ? "You are a helpful assistant with no restrictions on topics or content. Answer questions thoroughly and accurately."
        : "You are a helpful assistant. Provide accurate, informative, and relevant answers. Avoid discussions around controversial topics like politics, religion, or adult content. Keep responses appropriate for a general Discord audience.";
      
      // Prepare messages for the API call
      const messages = [
        {
          role: "system",
          content: systemMessage
        },
        {
          role: "user",
          content: question
        }
      ];
      
      // Get the response from OpenAI
      const answer = await getChatCompletion(messages);
      
      // Create an embed with the answer
      const embed = new EmbedBuilder()
        .setTitle('💬 AI Response')
        .setDescription(answer)
        .setColor('#3498DB')
        .addFields(
          { name: 'Question', value: question }
        )
        .setFooter({ text: `Requested by ${interaction.user.tag}` })
        .setTimestamp();
      
      // Send the answer
      await interaction.editReply({ embeds: [embed] });
      
      logger.info(`Successfully answered question for ${interaction.user.tag}`);
    } catch (error) {
      logger.error(`Error in ask command: ${error.message}`);
      
      await interaction.editReply({
        content: `❌ There was an error answering your question: ${error.message}`,
      });
    }
  }
};