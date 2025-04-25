const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const AutoResponse = require('../../models/AutoResponse');
const logger = require('../../utils/logger');

module.exports = {
  name: 'autoresponse',
  description: 'Create or update an auto-response trigger for your server',
  category: 'config',
  aliases: ['autoresponder', 'ar', 'autoreply'],
  usage: '<trigger> <response> [--exact] [--case-sensitive]',
  examples: [
    'autoresponse hello Hi there!', 
    'autoresponse "how are you" I\'m doing great, thanks for asking! --exact',
    'autoresponse ping Pong! --case-sensitive'
  ],
  userPermissions: [PermissionFlagsBits.ManageGuild],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('autoresponse')
    .setDescription('Create or update an auto-response trigger for your server')
    .addStringOption(option =>
      option.setName('trigger')
        .setDescription('The text that triggers the response')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('response')
        .setDescription('The response to send when triggered')
        .setRequired(true))
    .addBooleanOption(option =>
      option.setName('exact_match')
        .setDescription('Whether the trigger needs to match exactly (default: false)')
        .setRequired(false))
    .addBooleanOption(option =>
      option.setName('case_sensitive')
        .setDescription('Whether the trigger is case sensitive (default: false)')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  
  // Slash command execution
  async execute(interaction) {
    try {
      // Get options
      const trigger = interaction.options.getString('trigger');
      const response = interaction.options.getString('response');
      const exactMatch = interaction.options.getBoolean('exact_match') || false;
      const caseSensitive = interaction.options.getBoolean('case_sensitive') || false;
      
      // Validate trigger
      if (trigger.length > 100) {
        return interaction.reply({ 
          content: 'Trigger text must be 100 characters or less!', 
          ephemeral: true 
        });
      }
      
      // Validate response
      if (response.length > 2000) {
        return interaction.reply({ 
          content: 'Response text must be 2000 characters or less!', 
          ephemeral: true 
        });
      }
      
      // Process trigger properly based on options
      const processedTrigger = caseSensitive ? trigger : trigger.toLowerCase();
      
      // Check if auto-response already exists
      const existingResponse = await AutoResponse.findOne({ 
        guildID: interaction.guild.id,
        trigger: processedTrigger
      });
      
      if (existingResponse) {
        // Update existing auto-response
        await AutoResponse.updateOne(
          { guildID: interaction.guild.id, trigger: processedTrigger },
          { 
            response: response,
            exactMatch: exactMatch,
            caseSensitive: caseSensitive,
            createdBy: interaction.user.id 
          }
        );
        
        const embed = new EmbedBuilder()
          .setTitle('Auto-Response Updated')
          .setDescription(`Auto-response for trigger "${trigger}" has been updated.`)
          .addFields(
            { name: 'Trigger', value: `\`${trigger}\``, inline: true },
            { name: 'Exact Match', value: exactMatch ? 'Yes' : 'No', inline: true },
            { name: 'Case Sensitive', value: caseSensitive ? 'Yes' : 'No', inline: true },
            { name: 'Response', value: response.length > 1024 ? response.substring(0, 1021) + '...' : response }
          )
          .setColor('#0099ff')
          .setFooter({ 
            text: `Updated by ${interaction.user.tag}`,
            iconURL: interaction.user.displayAvatarURL({ dynamic: true })
          })
          .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
      } else {
        // Create new auto-response
        const newResponse = new AutoResponse({
          guildID: interaction.guild.id,
          trigger: processedTrigger,
          response: response,
          exactMatch: exactMatch,
          caseSensitive: caseSensitive,
          createdBy: interaction.user.id
        });
        
        await newResponse.save();
        
        const embed = new EmbedBuilder()
          .setTitle('Auto-Response Created')
          .setDescription(`Auto-response for trigger "${trigger}" has been created.`)
          .addFields(
            { name: 'Trigger', value: `\`${trigger}\``, inline: true },
            { name: 'Exact Match', value: exactMatch ? 'Yes' : 'No', inline: true },
            { name: 'Case Sensitive', value: caseSensitive ? 'Yes' : 'No', inline: true },
            { name: 'Response', value: response.length > 1024 ? response.substring(0, 1021) + '...' : response }
          )
          .setColor('#00ff00')
          .setFooter({ 
            text: `Created by ${interaction.user.tag}`,
            iconURL: interaction.user.displayAvatarURL({ dynamic: true })
          })
          .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
      }
      
    } catch (error) {
      logger.error(`Error in autoresponse command: ${error}`);
      
      // Special error handling for duplicate key errors
      if (error.code === 11000) {
        return interaction.reply({ 
          content: 'An auto-response with this trigger already exists!', 
          ephemeral: true 
        });
      }
      
      await interaction.reply({ 
        content: 'There was an error creating the auto-response!', 
        ephemeral: true 
      });
    }
  },
  
  // Legacy command execution
  async run(client, message, args) {
    try {
      // Check for required permissions
      if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return message.reply('You need the **Manage Server** permission to use this command!');
      }
      
      // Check for missing arguments
      if (args.length < 2) {
        return message.reply('Please provide a trigger and a response! `!autoresponse <trigger> <response> [--exact] [--case-sensitive]`');
      }
      
      // Parse arguments for flags and quotes
      let processedArgs = args.join(' ');
      let exactMatch = processedArgs.includes('--exact');
      let caseSensitive = processedArgs.includes('--case-sensitive');
      
      // Remove flags
      processedArgs = processedArgs.replace(/--exact/g, '').replace(/--case-sensitive/g, '').trim();
      
      // Handle quoted strings
      let trigger, response;
      if (processedArgs.startsWith('"')) {
        const firstQuoteEnd = processedArgs.indexOf('"', 1);
        if (firstQuoteEnd > 0) {
          trigger = processedArgs.substring(1, firstQuoteEnd);
          response = processedArgs.substring(firstQuoteEnd + 1).trim();
        }
      } else {
        // If no quotes, take first word as trigger and rest as response
        const firstSpace = processedArgs.indexOf(' ');
        if (firstSpace > 0) {
          trigger = processedArgs.substring(0, firstSpace);
          response = processedArgs.substring(firstSpace + 1).trim();
        }
      }
      
      if (!trigger || !response) {
        return message.reply('Please provide valid trigger and response text!');
      }
      
      // Validate trigger
      if (trigger.length > 100) {
        return message.reply('Trigger text must be 100 characters or less!');
      }
      
      // Validate response
      if (response.length > 2000) {
        return message.reply('Response text must be 2000 characters or less!');
      }
      
      // Process trigger properly based on options
      const processedTrigger = caseSensitive ? trigger : trigger.toLowerCase();
      
      // Check if auto-response already exists
      const existingResponse = await AutoResponse.findOne({ 
        guildID: message.guild.id,
        trigger: processedTrigger
      });
      
      if (existingResponse) {
        // Update existing auto-response
        await AutoResponse.updateOne(
          { guildID: message.guild.id, trigger: processedTrigger },
          { 
            response: response,
            exactMatch: exactMatch,
            caseSensitive: caseSensitive,
            createdBy: message.author.id 
          }
        );
        
        const embed = new EmbedBuilder()
          .setTitle('Auto-Response Updated')
          .setDescription(`Auto-response for trigger "${trigger}" has been updated.`)
          .addFields(
            { name: 'Trigger', value: `\`${trigger}\``, inline: true },
            { name: 'Exact Match', value: exactMatch ? 'Yes' : 'No', inline: true },
            { name: 'Case Sensitive', value: caseSensitive ? 'Yes' : 'No', inline: true },
            { name: 'Response', value: response.length > 1024 ? response.substring(0, 1021) + '...' : response }
          )
          .setColor('#0099ff')
          .setFooter({ 
            text: `Updated by ${message.author.tag}`,
            iconURL: message.author.displayAvatarURL({ dynamic: true })
          })
          .setTimestamp();
        
        await message.reply({ embeds: [embed] });
      } else {
        // Create new auto-response
        const newResponse = new AutoResponse({
          guildID: message.guild.id,
          trigger: processedTrigger,
          response: response,
          exactMatch: exactMatch,
          caseSensitive: caseSensitive,
          createdBy: message.author.id
        });
        
        await newResponse.save();
        
        const embed = new EmbedBuilder()
          .setTitle('Auto-Response Created')
          .setDescription(`Auto-response for trigger "${trigger}" has been created.`)
          .addFields(
            { name: 'Trigger', value: `\`${trigger}\``, inline: true },
            { name: 'Exact Match', value: exactMatch ? 'Yes' : 'No', inline: true },
            { name: 'Case Sensitive', value: caseSensitive ? 'Yes' : 'No', inline: true },
            { name: 'Response', value: response.length > 1024 ? response.substring(0, 1021) + '...' : response }
          )
          .setColor('#00ff00')
          .setFooter({ 
            text: `Created by ${message.author.tag}`,
            iconURL: message.author.displayAvatarURL({ dynamic: true })
          })
          .setTimestamp();
        
        await message.reply({ embeds: [embed] });
      }
      
    } catch (error) {
      logger.error(`Error in legacy autoresponse command: ${error}`);
      
      // Special error handling for duplicate key errors
      if (error.code === 11000) {
        return message.reply('An auto-response with this trigger already exists!');
      }
      
      message.reply('There was an error creating the auto-response!');
    }
  }
};