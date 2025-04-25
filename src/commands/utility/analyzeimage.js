const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getChatCompletion } = require('../../utils/openai');
const logger = require('../../utils/logger');
const axios = require('axios');

module.exports = {
  name: 'analyzeimage',
  description: 'Analyze an image using AI',
  category: 'utility',
  cooldown: 30, // 30 second cooldown to prevent spamming
  usage: '<image_url or attachment>',
  examples: ['analyzeimage [with image attached]'],
  
  data: new SlashCommandBuilder()
    .setName('analyzeimage')
    .setDescription('Analyze an image using AI')
    .addAttachmentOption(option => 
      option
        .setName('image')
        .setDescription('The image to analyze')
        .setRequired(false)
    )
    .addStringOption(option => 
      option
        .setName('image_url')
        .setDescription('URL of the image to analyze')
        .setRequired(false)
    ),
  
  async execute(interaction) {
    // Get the image either from attachment or URL
    const attachment = interaction.options.getAttachment('image');
    const imageUrl = interaction.options.getString('image_url');
    
    if (!attachment && !imageUrl) {
      return interaction.reply({
        content: 'Please provide either an image attachment or an image URL.',
        ephemeral: true
      });
    }
    
    // Use the URL from the attachment or the provided URL
    const url = attachment ? attachment.url : imageUrl;
    
    // Defer the reply due to potentially long processing time
    await interaction.deferReply();
    
    try {
      // Download the image and convert it to base64
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const base64Image = Buffer.from(response.data).toString('base64');
      
      logger.info(`Analyzing image for ${interaction.user.tag} (${interaction.user.id})`);
      
      // Prepare messages for the API call
      const messages = [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please analyze this image in detail. Describe what you see, including any objects, people, scenes, colors, and other notable elements. Also mention any text visible in the image."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ],
        },
      ];
      
      // Get the analysis from OpenAI
      const analysis = await getChatCompletion(messages);
      
      // Create an embed with the analysis
      const embed = new EmbedBuilder()
        .setTitle('🔎 Image Analysis')
        .setDescription(analysis)
        .setColor('#4169E1')
        .setThumbnail(url)
        .setFooter({ text: `Requested by ${interaction.user.tag}` })
        .setTimestamp();
      
      // Send the analysis
      await interaction.editReply({ embeds: [embed] });
      
      logger.info(`Image analysis completed for ${interaction.user.tag} (${interaction.user.id})`);
    } catch (error) {
      logger.error(`Error in analyzeimage command: ${error.message}`);
      
      await interaction.editReply({
        content: `❌ There was an error analyzing the image: ${error.message}`,
      });
    }
  }
};