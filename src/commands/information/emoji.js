const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const logger = require('../../utils/logger');

module.exports = {
  name: 'emoji',
  description: 'Display information about an emoji or list all server emojis',
  category: 'information',
  aliases: ['emote', 'emojis', 'emotes'],
  usage: '[emoji]',
  examples: ['emoji', 'emoji 😀', 'emoji :custom_emoji:'],
  userPermissions: [],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('emoji')
    .setDescription('Display information about an emoji or list all server emojis')
    .addStringOption(option => 
      option.setName('emoji')
        .setDescription('The emoji to get information about')
        .setRequired(false)),
  
  // Slash command execution
  async execute(interaction) {
    try {
      const emojiInput = interaction.options.getString('emoji');
      
      // If no emoji provided, list all server emojis
      if (!emojiInput) {
        return await listServerEmojis(interaction);
      }
      
      // Parse the emoji string
      const emojiMatch = emojiInput.match(/<?(a)?:?(\w{2,32}):(\d{17,19})>?/);
      
      if (!emojiMatch) {
        // Handle unicode emojis
        if (isUnicodeEmoji(emojiInput)) {
          return await showUnicodeEmojiInfo(interaction, emojiInput);
        }
        
        return interaction.reply({
          content: 'Please provide a valid emoji.',
          ephemeral: true
        });
      }
      
      // Get custom emoji information
      const isAnimated = Boolean(emojiMatch[1]);
      const emojiName = emojiMatch[2];
      const emojiId = emojiMatch[3];
      
      // Create embed with emoji info
      const embed = new EmbedBuilder()
        .setTitle(`Emoji Information - ${emojiName}`)
        .setColor('#3498db')
        .setThumbnail(`https://cdn.discordapp.com/emojis/${emojiId}.${isAnimated ? 'gif' : 'png'}?size=512`)
        .addFields(
          { name: 'Name', value: emojiName, inline: true },
          { name: 'ID', value: emojiId, inline: true },
          { name: 'Animated', value: isAnimated ? 'Yes' : 'No', inline: true },
          { name: 'Usage Format', value: `\`<${isAnimated ? 'a' : ''}:${emojiName}:${emojiId}>\``, inline: false }
        )
        .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      
      // Create button to download emoji
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setLabel('Download Emoji')
            .setStyle(ButtonStyle.Link)
            .setURL(`https://cdn.discordapp.com/emojis/${emojiId}.${isAnimated ? 'gif' : 'png'}?size=512`)
        );
      
      await interaction.reply({ embeds: [embed], components: [row] });
      
    } catch (error) {
      logger.error(`Error executing emoji command: ${error}`);
      await interaction.reply({ 
        content: 'There was an error executing this command!', 
        ephemeral: true 
      });
    }
  },
  
  // Legacy command execution
  async run(client, message, args) {
    try {
      // If no emoji provided, list all server emojis
      if (!args.length) {
        return await legacyListServerEmojis(message);
      }
      
      // Parse the emoji string
      const emojiInput = args[0];
      const emojiMatch = emojiInput.match(/<?(a)?:?(\w{2,32}):(\d{17,19})>?/);
      
      if (!emojiMatch) {
        // Handle unicode emojis
        if (isUnicodeEmoji(emojiInput)) {
          return await legacyShowUnicodeEmojiInfo(message, emojiInput);
        }
        
        return message.reply('Please provide a valid emoji.');
      }
      
      // Get custom emoji information
      const isAnimated = Boolean(emojiMatch[1]);
      const emojiName = emojiMatch[2];
      const emojiId = emojiMatch[3];
      
      // Create embed with emoji info
      const embed = new EmbedBuilder()
        .setTitle(`Emoji Information - ${emojiName}`)
        .setColor('#3498db')
        .setThumbnail(`https://cdn.discordapp.com/emojis/${emojiId}.${isAnimated ? 'gif' : 'png'}?size=512`)
        .addFields(
          { name: 'Name', value: emojiName, inline: true },
          { name: 'ID', value: emojiId, inline: true },
          { name: 'Animated', value: isAnimated ? 'Yes' : 'No', inline: true },
          { name: 'Usage Format', value: `\`<${isAnimated ? 'a' : ''}:${emojiName}:${emojiId}>\``, inline: false }
        )
        .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      
      // Create button to download emoji
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setLabel('Download Emoji')
            .setStyle(ButtonStyle.Link)
            .setURL(`https://cdn.discordapp.com/emojis/${emojiId}.${isAnimated ? 'gif' : 'png'}?size=512`)
        );
      
      await message.reply({ embeds: [embed], components: [row] });
      
    } catch (error) {
      logger.error(`Error executing emoji command: ${error}`);
      message.reply('There was an error executing this command!');
    }
  }
};

// Function to list all server emojis (slash command)
async function listServerEmojis(interaction) {
  const { guild } = interaction;
  
  // Fetch all emojis
  await guild.emojis.fetch();
  
  // Separate emojis into static and animated
  const staticEmojis = guild.emojis.cache.filter(emoji => !emoji.animated);
  const animatedEmojis = guild.emojis.cache.filter(emoji => emoji.animated);
  
  // Format emojis to display in embed
  let staticEmojiDisplay = staticEmojis.size > 0 ? 
    staticEmojis.map(emoji => `<:${emoji.name}:${emoji.id}>`).join(' ') : 
    'No static emojis';
  
  let animatedEmojiDisplay = animatedEmojis.size > 0 ? 
    animatedEmojis.map(emoji => `<a:${emoji.name}:${emoji.id}>`).join(' ') : 
    'No animated emojis';
  
  // Trim emoji displays if they're too long
  if (staticEmojiDisplay.length > 1024) {
    staticEmojiDisplay = staticEmojiDisplay.substring(0, 1020) + '...';
  }
  
  if (animatedEmojiDisplay.length > 1024) {
    animatedEmojiDisplay = animatedEmojiDisplay.substring(0, 1020) + '...';
  }
  
  // Create embed
  const embed = new EmbedBuilder()
    .setTitle(`${guild.name} Emojis`)
    .setColor('#3498db')
    .setThumbnail(guild.iconURL({ dynamic: true }))
    .addFields(
      { name: `Static Emojis [${staticEmojis.size}/${guild.emojis.cache.size}]`, value: staticEmojiDisplay },
      { name: `Animated Emojis [${animatedEmojis.size}/${guild.emojis.cache.size}]`, value: animatedEmojiDisplay }
    )
    .setFooter({ text: `Total Emojis: ${guild.emojis.cache.size}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
    .setTimestamp();
  
  await interaction.reply({ embeds: [embed] });
}

// Function to list all server emojis (legacy command)
async function legacyListServerEmojis(message) {
  const { guild } = message;
  
  // Fetch all emojis
  await guild.emojis.fetch();
  
  // Separate emojis into static and animated
  const staticEmojis = guild.emojis.cache.filter(emoji => !emoji.animated);
  const animatedEmojis = guild.emojis.cache.filter(emoji => emoji.animated);
  
  // Format emojis to display in embed
  let staticEmojiDisplay = staticEmojis.size > 0 ? 
    staticEmojis.map(emoji => `<:${emoji.name}:${emoji.id}>`).join(' ') : 
    'No static emojis';
  
  let animatedEmojiDisplay = animatedEmojis.size > 0 ? 
    animatedEmojis.map(emoji => `<a:${emoji.name}:${emoji.id}>`).join(' ') : 
    'No animated emojis';
  
  // Trim emoji displays if they're too long
  if (staticEmojiDisplay.length > 1024) {
    staticEmojiDisplay = staticEmojiDisplay.substring(0, 1020) + '...';
  }
  
  if (animatedEmojiDisplay.length > 1024) {
    animatedEmojiDisplay = animatedEmojiDisplay.substring(0, 1020) + '...';
  }
  
  // Create embed
  const embed = new EmbedBuilder()
    .setTitle(`${guild.name} Emojis`)
    .setColor('#3498db')
    .setThumbnail(guild.iconURL({ dynamic: true }))
    .addFields(
      { name: `Static Emojis [${staticEmojis.size}/${guild.emojis.cache.size}]`, value: staticEmojiDisplay },
      { name: `Animated Emojis [${animatedEmojis.size}/${guild.emojis.cache.size}]`, value: animatedEmojiDisplay }
    )
    .setFooter({ text: `Total Emojis: ${guild.emojis.cache.size}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
    .setTimestamp();
  
  await message.reply({ embeds: [embed] });
}

// Function to show unicode emoji info (slash command)
async function showUnicodeEmojiInfo(interaction, emoji) {
  const embed = new EmbedBuilder()
    .setTitle('Unicode Emoji Information')
    .setDescription(`Emoji: ${emoji}`)
    .setColor('#3498db')
    .addFields(
      { name: 'Unicode Character', value: `\`${emoji}\``, inline: true },
      { name: 'Type', value: 'Unicode Emoji', inline: true }
    )
    .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
    .setTimestamp();
  
  await interaction.reply({ embeds: [embed] });
}

// Function to show unicode emoji info (legacy command)
async function legacyShowUnicodeEmojiInfo(message, emoji) {
  const embed = new EmbedBuilder()
    .setTitle('Unicode Emoji Information')
    .setDescription(`Emoji: ${emoji}`)
    .setColor('#3498db')
    .addFields(
      { name: 'Unicode Character', value: `\`${emoji}\``, inline: true },
      { name: 'Type', value: 'Unicode Emoji', inline: true }
    )
    .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
    .setTimestamp();
  
  await message.reply({ embeds: [embed] });
}

// Function to check if a string is a Unicode emoji
function isUnicodeEmoji(str) {
  // Simple check for emoji
  return /\p{Emoji}/u.test(str);
}