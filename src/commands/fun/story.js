const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getChatCompletion } = require('../../utils/openai');
const logger = require('../../utils/logger');

module.exports = {
  name: 'story',
  description: 'Generate a creative story using AI',
  category: 'fun',
  cooldown: 60, // 1 minute cooldown
  usage: '<theme> [genre] [length]',
  examples: [
    'story Dragon adventure',
    'story Space exploration --genre sci-fi --length medium',
    'story Haunted house --genre horror'
  ],
  
  data: new SlashCommandBuilder()
    .setName('story')
    .setDescription('Generate a creative story using AI')
    .addStringOption(option => 
      option
        .setName('theme')
        .setDescription('The main theme or subject of the story')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('genre')
        .setDescription('The genre of the story')
        .setRequired(false)
        .addChoices(
          { name: 'Fantasy', value: 'fantasy' },
          { name: 'Science Fiction', value: 'sci-fi' },
          { name: 'Horror', value: 'horror' },
          { name: 'Adventure', value: 'adventure' },
          { name: 'Mystery', value: 'mystery' },
          { name: 'Romance', value: 'romance' },
          { name: 'Comedy', value: 'comedy' },
          { name: 'Historical', value: 'historical' }
        )
    )
    .addStringOption(option =>
      option
        .setName('length')
        .setDescription('The length of the story')
        .setRequired(false)
        .addChoices(
          { name: 'Short (2-3 paragraphs)', value: 'short' },
          { name: 'Medium (4-5 paragraphs)', value: 'medium' },
          { name: 'Long (6-7 paragraphs)', value: 'long' }
        )
    ),
  
  async execute(interaction) {
    const theme = interaction.options.getString('theme');
    const genre = interaction.options.getString('genre') || 'fantasy';
    const length = interaction.options.getString('length') || 'medium';
    
    // Define length in paragraphs
    const paragraphCount = {
      'short': '2-3',
      'medium': '4-5',
      'long': '6-7'
    }[length];
    
    // Defer the reply due to potentially long processing time
    await interaction.deferReply();
    
    try {
      logger.info(`Generating ${length} ${genre} story about "${theme}" for ${interaction.user.tag} (${interaction.user.id})`);
      
      // Prepare the prompt for story generation
      const prompt = `Write a creative ${genre} story about ${theme}. The story should be ${paragraphCount} paragraphs long. Make it engaging and suitable for a general audience on Discord. Include a title for the story.`;
      
      // Prepare messages for the API call
      const messages = [
        {
          role: "system",
          content: "You are a creative storyteller who specializes in writing engaging short stories in various genres. Your stories should be appropriate for a general audience."
        },
        {
          role: "user",
          content: prompt
        }
      ];
      
      // Get the story from OpenAI
      const storyText = await getChatCompletion(messages);
      
      // Extract title (first line) and story (rest of text)
      let title = "Untitled Story";
      let story = storyText;
      
      // Try to extract title if it exists
      if (storyText.includes("\\n")) {
        const parts = storyText.split("\\n");
        if (parts[0].length < 100) { // Make sure it's a reasonable title
          title = parts[0].replace(/^#+ /, '').trim(); // Remove markdown headings
          story = parts.slice(1).join("\\n").trim();
        }
      }
      
      // Create an embed with the story
      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(story)
        .setColor('#FF8C00')
        .addFields(
          { name: 'Theme', value: theme, inline: true },
          { name: 'Genre', value: genre.charAt(0).toUpperCase() + genre.slice(1), inline: true },
          { name: 'Length', value: length.charAt(0).toUpperCase() + length.slice(1), inline: true }
        )
        .setFooter({ text: `Requested by ${interaction.user.tag}` })
        .setTimestamp();
      
      // Send the story
      await interaction.editReply({ embeds: [embed] });
      
      logger.info(`Story generated successfully for ${interaction.user.tag}`);
    } catch (error) {
      logger.error(`Error in story command: ${error.message}`);
      
      await interaction.editReply({
        content: `❌ There was an error generating your story: ${error.message}`,
      });
    }
  }
};