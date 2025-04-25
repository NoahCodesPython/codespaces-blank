const { SlashCommandBuilder, EmbedBuilder, codeBlock } = require('discord.js');
const { isOwner } = require('../../utils/ownerCheck');
const logger = require('../../utils/logger');
const { inspect } = require('util');

module.exports = {
  name: 'eval',
  description: 'Evaluates JavaScript code',
  category: 'owner',
  aliases: ['evaluate', 'ev'],
  usage: '<code>',
  examples: ['eval message.guild.memberCount', 'eval client.users.cache.size'],
  userPermissions: [],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('eval')
    .setDescription('Evaluates JavaScript code')
    .addStringOption(option => 
      option.setName('code')
        .setDescription('The code to evaluate')
        .setRequired(true)),
  
  // Slash command execution
  async execute(interaction) {
    try {
      // Check if executor is a bot owner
      const isExecutorOwner = await isOwner(interaction.user.id);
      
      if (!isExecutorOwner) {
        return interaction.reply({
          content: 'You do not have permission to use this command.',
          ephemeral: true
        });
      }
      
      // Defer reply
      await interaction.deferReply();
      
      const code = interaction.options.getString('code');
      
      // Create context aliases
      const { client, guild, channel, user } = interaction;
      
      try {
        let evaled = eval(code);
        
        // Handle promises
        if (evaled instanceof Promise) {
          evaled = await evaled;
        }
        
        // Inspect the result
        const result = inspect(evaled, { depth: 0 }).replace(client.token, '[REDACTED]');
        
        // Format result based on length
        let response;
        if (result.length > 4000) {
          response = 'Result was too long, sending as a file...';
          
          const resultAttachment = Buffer.from(result);
          await interaction.editReply({
            content: response,
            files: [{ attachment: resultAttachment, name: 'eval-result.js' }]
          });
        } else {
          response = codeBlock('js', result);
          
          const embed = new EmbedBuilder()
            .setTitle('Eval Result')
            .setDescription(response)
            .setColor('#00FF00')
            .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
            .setTimestamp();
          
          await interaction.editReply({ embeds: [embed] });
        }
      } catch (error) {
        // Handle errors
        const errorMessage = error.stack || error.toString();
        
        const embed = new EmbedBuilder()
          .setTitle('Eval Error')
          .setDescription(codeBlock('js', errorMessage))
          .setColor('#FF0000')
          .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
          .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
      }
      
    } catch (error) {
      logger.error(`Error in eval command: ${error}`);
      
      if (interaction.deferred) {
        await interaction.editReply({ 
          content: 'There was an error executing the eval command.'
        });
      } else {
        await interaction.reply({ 
          content: 'There was an error executing this command!', 
          ephemeral: true 
        });
      }
    }
  },
  
  // Legacy command execution
  async run(client, message, args) {
    try {
      // Check if executor is a bot owner
      const isExecutorOwner = await isOwner(message.author.id);
      
      if (!isExecutorOwner) {
        return message.reply('You do not have permission to use this command.');
      }
      
      if (!args.length) {
        return message.reply('Please provide code to evaluate.');
      }
      
      const code = args.join(' ');
      
      // Create context aliases
      const { guild, channel, author } = message;
      
      try {
        let evaled = eval(code);
        
        // Handle promises
        if (evaled instanceof Promise) {
          evaled = await evaled;
        }
        
        // Inspect the result
        const result = inspect(evaled, { depth: 0 }).replace(client.token, '[REDACTED]');
        
        // Format result based on length
        let response;
        if (result.length > 4000) {
          response = 'Result was too long, sending as a file...';
          
          const resultAttachment = Buffer.from(result);
          await message.reply({
            content: response,
            files: [{ attachment: resultAttachment, name: 'eval-result.js' }]
          });
        } else {
          response = codeBlock('js', result);
          
          const embed = new EmbedBuilder()
            .setTitle('Eval Result')
            .setDescription(response)
            .setColor('#00FF00')
            .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
            .setTimestamp();
          
          await message.reply({ embeds: [embed] });
        }
      } catch (error) {
        // Handle errors
        const errorMessage = error.stack || error.toString();
        
        const embed = new EmbedBuilder()
          .setTitle('Eval Error')
          .setDescription(codeBlock('js', errorMessage))
          .setColor('#FF0000')
          .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
          .setTimestamp();
        
        await message.reply({ embeds: [embed] });
      }
      
    } catch (error) {
      logger.error(`Error in legacy eval command: ${error}`);
      message.reply('There was an error executing the eval command.');
    }
  }
};