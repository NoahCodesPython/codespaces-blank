const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const AutoResponse = require('../../models/AutoResponse');
const logger = require('../../utils/logger');

module.exports = {
  name: 'autoresponselist',
  description: 'List all auto-responses in the server',
  category: 'config',
  aliases: ['arlist', 'listar', 'autoresponses'],
  usage: '',
  examples: ['autoresponselist'],
  userPermissions: [],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('autoresponselist')
    .setDescription('List all auto-responses in the server')
    .addIntegerOption(option => 
      option.setName('page')
        .setDescription('The page number to view')
        .setRequired(false)
        .setMinValue(1)),
  
  // Slash command execution
  async execute(interaction) {
    try {
      // Get page from options or default to 1
      const page = interaction.options.getInteger('page') || 1;
      
      // Get all auto-responses for the guild
      const responses = await AutoResponse.find({ 
        guildID: interaction.guild.id 
      }).sort({ trigger: 1 }); // Sort alphabetically by trigger
      
      // Check if any auto-responses exist
      if (responses.length === 0) {
        return interaction.reply({
          content: 'There are no auto-responses in this server. Use `/autoresponse` to create one!',
          ephemeral: true
        });
      }
      
      // Create pagination
      const responsesPerPage = 5;
      const totalPages = Math.ceil(responses.length / responsesPerPage);
      
      // Check if page is valid
      if (page > totalPages) {
        return interaction.reply({
          content: `Invalid page number. There are only ${totalPages} pages of auto-responses.`,
          ephemeral: true
        });
      }
      
      // Get auto-responses for the current page
      const startIndex = (page - 1) * responsesPerPage;
      const endIndex = Math.min(startIndex + responsesPerPage, responses.length);
      const currentPageResponses = responses.slice(startIndex, endIndex);
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle('Auto-Responses')
        .setDescription(`Here are the auto-responses for ${interaction.guild.name}:`)
        .setColor('#0099ff')
        .setFooter({ 
          text: `Page ${page}/${totalPages} • Total: ${responses.length} auto-responses` 
        })
        .setTimestamp();
      
      // Add auto-responses to embed
      currentPageResponses.forEach((ar, index) => {
        const options = [];
        if (ar.exactMatch) options.push('Exact Match');
        if (ar.caseSensitive) options.push('Case Sensitive');
        
        embed.addFields({
          name: `${startIndex + index + 1}. ${ar.trigger}`,
          value: `${options.length > 0 ? `**Options**: ${options.join(', ')}\n` : ''}**Response**: ${
            ar.response.length > 100 ? ar.response.substring(0, 97) + '...' : ar.response
          }`
        });
      });
      
      // Create pagination buttons
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`arlist_prev_${page}`)
            .setLabel('Previous')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page <= 1),
          new ButtonBuilder()
            .setCustomId(`arlist_next_${page}`)
            .setLabel('Next')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= totalPages)
        );
      
      // Send response
      await interaction.reply({ 
        embeds: [embed],
        components: totalPages > 1 ? [row] : []
      });
      
      // Set up button collector
      if (totalPages > 1) {
        const filter = i => i.user.id === interaction.user.id && 
                             (i.customId.startsWith('arlist_prev_') || 
                              i.customId.startsWith('arlist_next_'));
        
        const collector = interaction.channel.createMessageComponentCollector({ 
          filter, 
          time: 60000 
        });
        
        collector.on('collect', async i => {
          let newPage = page;
          
          if (i.customId.startsWith('arlist_prev_')) {
            newPage = page - 1;
          } else if (i.customId.startsWith('arlist_next_')) {
            newPage = page + 1;
          }
          
          // Create a new interaction to execute the command with the new page
          if (newPage !== page) {
            await i.deferUpdate();
            
            // Use the autoresponselist command with the new page
            const command = interaction.client.slashCommands.get('autoresponselist');
            if (command) {
              const newInteraction = {
                ...interaction,
                options: {
                  getInteger: (name) => name === 'page' ? newPage : null
                }
              };
              
              await command.execute(newInteraction);
            }
          }
        });
        
        collector.on('end', () => {
          // Remove buttons when collector expires
          interaction.editReply({
            components: []
          }).catch(() => {});
        });
      }
      
    } catch (error) {
      logger.error(`Error in autoresponselist command: ${error}`);
      await interaction.reply({ 
        content: 'There was an error listing the auto-responses!', 
        ephemeral: true 
      });
    }
  },
  
  // Legacy command execution
  async run(client, message, args) {
    try {
      // Get page from args or default to 1
      const page = args[0] ? parseInt(args[0]) : 1;
      
      if (isNaN(page) || page < 1) {
        return message.reply('Please provide a valid page number!');
      }
      
      // Get all auto-responses for the guild
      const responses = await AutoResponse.find({ 
        guildID: message.guild.id 
      }).sort({ trigger: 1 }); // Sort alphabetically by trigger
      
      // Check if any auto-responses exist
      if (responses.length === 0) {
        return message.reply('There are no auto-responses in this server. Use the `autoresponse` command to create one!');
      }
      
      // Create pagination
      const responsesPerPage = 5;
      const totalPages = Math.ceil(responses.length / responsesPerPage);
      
      // Check if page is valid
      if (page > totalPages) {
        return message.reply(`Invalid page number. There are only ${totalPages} pages of auto-responses.`);
      }
      
      // Get auto-responses for the current page
      const startIndex = (page - 1) * responsesPerPage;
      const endIndex = Math.min(startIndex + responsesPerPage, responses.length);
      const currentPageResponses = responses.slice(startIndex, endIndex);
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle('Auto-Responses')
        .setDescription(`Here are the auto-responses for ${message.guild.name}:`)
        .setColor('#0099ff')
        .setFooter({ 
          text: `Page ${page}/${totalPages} • Total: ${responses.length} auto-responses` 
        })
        .setTimestamp();
      
      // Add auto-responses to embed
      currentPageResponses.forEach((ar, index) => {
        const options = [];
        if (ar.exactMatch) options.push('Exact Match');
        if (ar.caseSensitive) options.push('Case Sensitive');
        
        embed.addFields({
          name: `${startIndex + index + 1}. ${ar.trigger}`,
          value: `${options.length > 0 ? `**Options**: ${options.join(', ')}\n` : ''}**Response**: ${
            ar.response.length > 100 ? ar.response.substring(0, 97) + '...' : ar.response
          }`
        });
      });
      
      // Create pagination buttons
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`arlist_prev_${page}`)
            .setLabel('Previous')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page <= 1),
          new ButtonBuilder()
            .setCustomId(`arlist_next_${page}`)
            .setLabel('Next')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= totalPages)
        );
      
      // Send response
      const response = await message.reply({ 
        embeds: [embed],
        components: totalPages > 1 ? [row] : []
      });
      
      // Set up button collector
      if (totalPages > 1) {
        const filter = i => i.user.id === message.author.id && 
                             (i.customId.startsWith('arlist_prev_') || 
                              i.customId.startsWith('arlist_next_'));
        
        const collector = response.createMessageComponentCollector({ 
          filter, 
          time: 60000 
        });
        
        collector.on('collect', async i => {
          let newPage = page;
          
          if (i.customId.startsWith('arlist_prev_')) {
            newPage = page - 1;
          } else if (i.customId.startsWith('arlist_next_')) {
            newPage = page + 1;
          }
          
          if (newPage !== page) {
            await i.deferUpdate();
            
            // Recursive call with the new page
            const command = client.commands.get('autoresponselist');
            if (command) {
              await command.run(client, message, [newPage.toString()]);
            }
          }
        });
        
        collector.on('end', () => {
          // Remove buttons when collector expires
          response.edit({
            components: []
          }).catch(() => {});
        });
      }
      
    } catch (error) {
      logger.error(`Error in legacy autoresponselist command: ${error}`);
      message.reply('There was an error listing the auto-responses!');
    }
  }
};