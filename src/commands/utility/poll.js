const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../../utils/logger');

module.exports = {
  name: 'poll',
  description: 'Create a poll for users to vote on',
  category: 'utility',
  aliases: ['createpoll', 'vote'],
  usage: '<question>',
  examples: ['poll Is this bot great?'],
  userPermissions: [PermissionFlagsBits.ManageMessages],
  botPermissions: [PermissionFlagsBits.AddReactions],
  
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a poll for users to vote on')
    .addStringOption(option => 
      option.setName('question')
        .setDescription('The question to ask in the poll')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('option1')
        .setDescription('First option (optional)')
        .setRequired(false))
    .addStringOption(option => 
      option.setName('option2')
        .setDescription('Second option (optional)')
        .setRequired(false))
    .addStringOption(option => 
      option.setName('option3')
        .setDescription('Third option (optional)')
        .setRequired(false))
    .addStringOption(option => 
      option.setName('option4')
        .setDescription('Fourth option (optional)')
        .setRequired(false))
    .addStringOption(option => 
      option.setName('option5')
        .setDescription('Fifth option (optional)')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  
  // Slash command execution
  async execute(interaction) {
    try {
      const question = interaction.options.getString('question');
      
      // Check for options
      const option1 = interaction.options.getString('option1');
      const option2 = interaction.options.getString('option2');
      const option3 = interaction.options.getString('option3');
      const option4 = interaction.options.getString('option4');
      const option5 = interaction.options.getString('option5');
      
      // Determine if this is a simple yes/no poll or one with options
      const hasOptions = option1 && option2;
      
      if (hasOptions) {
        // Create poll with options
        const options = [option1, option2];
        if (option3) options.push(option3);
        if (option4) options.push(option4);
        if (option5) options.push(option5);
        
        const reactions = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'].slice(0, options.length);
        
        let description = `**${question}**\n\n`;
        options.forEach((option, index) => {
          description += `${reactions[index]} ${option}\n`;
        });
        
        const embed = new EmbedBuilder()
          .setTitle('📊 Poll')
          .setDescription(description)
          .setColor('#0099ff')
          .setFooter({ text: `Poll by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
          .setTimestamp();
        
        const message = await interaction.reply({ embeds: [embed], fetchReply: true });
        
        // Add reactions
        for (const reaction of reactions) {
          await message.react(reaction);
        }
      } else {
        // Simple yes/no poll
        const embed = new EmbedBuilder()
          .setTitle('📊 Poll')
          .setDescription(`**${question}**\n\n👍 Yes\n👎 No`)
          .setColor('#0099ff')
          .setFooter({ text: `Poll by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
          .setTimestamp();
        
        const message = await interaction.reply({ embeds: [embed], fetchReply: true });
        
        // Add reactions
        await message.react('👍');
        await message.react('👎');
      }
      
    } catch (error) {
      logger.error(`Error in poll command: ${error}`);
      interaction.reply({ 
        content: 'There was an error creating the poll!', 
        ephemeral: true 
      });
    }
  },
  
  // Legacy command execution
  async run(client, message, args) {
    try {
      // Check permissions
      if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        return message.reply('You need the Manage Messages permission to use this command.');
      }
      
      // Get the question
      const question = args.join(' ');
      
      if (!question) {
        return message.reply('Please provide a question for the poll!');
      }
      
      // Create a simple yes/no poll
      const embed = new EmbedBuilder()
        .setTitle('📊 Poll')
        .setDescription(`**${question}**\n\n👍 Yes\n👎 No`)
        .setColor('#0099ff')
        .setFooter({ text: `Poll by ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      
      const pollMessage = await message.channel.send({ embeds: [embed] });
      
      // Add reactions
      await pollMessage.react('👍');
      await pollMessage.react('👎');
      
      // Delete the command message if possible
      if (message.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
        message.delete().catch(() => {});
      }
      
    } catch (error) {
      logger.error(`Error in legacy poll command: ${error}`);
      message.reply('There was an error creating the poll!');
    }
  }
};