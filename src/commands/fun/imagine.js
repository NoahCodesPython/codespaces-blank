const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { generateImage } = require('../../utils/openai');
const logger = require('../../utils/logger');
const { isOwner } = require('../../utils/ownerCheck');

module.exports = {
  name: 'imagine',
  description: 'Generate an image from a text prompt using AI',
  category: 'fun',
  cooldown: 30, // 30 second cooldown to prevent spamming
  usage: '<prompt> [--size <1024x1024|1792x1024|1024x1792>] [--quality <standard|hd>] [--style <vivid|natural>]',
  examples: [
    'imagine a cat riding a skateboard',
    'imagine a futuristic city skyline --size 1792x1024 --style natural',
    'imagine an underwater castle with mermaids --quality hd'
  ],
  
  data: new SlashCommandBuilder()
    .setName('imagine')
    .setDescription('Generate an image from a text prompt using AI')
    .addStringOption(option => 
      option
        .setName('prompt')
        .setDescription('The text description of the image you want to generate')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('size')
        .setDescription('The size of the generated image')
        .setRequired(false)
        .addChoices(
          { name: 'Square (1024x1024)', value: '1024x1024' },
          { name: 'Landscape (1792x1024)', value: '1792x1024' },
          { name: 'Portrait (1024x1792)', value: '1024x1792' }
        )
    )
    .addStringOption(option =>
      option
        .setName('quality')
        .setDescription('The quality of the generated image')
        .setRequired(false)
        .addChoices(
          { name: 'Standard', value: 'standard' },
          { name: 'HD', value: 'hd' }
        )
    )
    .addStringOption(option =>
      option
        .setName('style')
        .setDescription('The style of the generated image')
        .setRequired(false)
        .addChoices(
          { name: 'Vivid', value: 'vivid' },
          { name: 'Natural', value: 'natural' }
        )
    ),
  
  async execute(interaction) {
    const prompt = interaction.options.getString('prompt');
    const size = interaction.options.getString('size') || '1024x1024';
    const quality = interaction.options.getString('quality') || 'standard';
    const style = interaction.options.getString('style') || 'vivid';
    
    // Check if HD quality is requested but user is not an owner
    if (quality === 'hd') {
      const isUserOwner = await isOwner(interaction.user.id);
      if (!isUserOwner) {
        return interaction.reply({
          content: 'HD quality is only available for bot owners. Please use standard quality instead.',
          ephemeral: true
        });
      }
    }
    
    // Create a loading message
    await interaction.reply({
      content: '🎨 **Generating your image...**\\nThis may take up to 30 seconds, please be patient!',
    });
    
    try {
      const result = await generateImage(prompt, size, quality, style);
      
      // Create an embed for the image
      const embed = new EmbedBuilder()
        .setTitle('🖼️ AI Generated Image')
        .setDescription(`**Prompt**: ${prompt}`)
        .setImage(result.url)
        .addFields(
          { name: 'Size', value: size, inline: true },
          { name: 'Quality', value: quality, inline: true },
          { name: 'Style', value: style, inline: true }
        )
        .setColor('#8A2BE2')
        .setFooter({ text: `Requested by ${interaction.user.tag}` })
        .setTimestamp();
      
      // Edit the loading message with the image embed
      await interaction.editReply({
        content: null,
        embeds: [embed]
      });
      
      logger.info(`Image generated for ${interaction.user.tag} (${interaction.user.id}) with prompt: ${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}`);
    } catch (error) {
      logger.error(`Error in imagine command: ${error.message}`);
      
      // Handle content policy violations specifically
      if (error.message.includes('content policy')) {
        await interaction.editReply({
          content: '❌ Your image could not be generated because it may violate content policies. Please try a different prompt.',
        });
      } else {
        await interaction.editReply({
          content: `❌ There was an error generating your image: ${error.message}`,
        });
      }
    }
  }
};