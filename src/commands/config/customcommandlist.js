const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const CustomCommand = require('../../models/CustomCommand');
const logger = require('../../utils/logger');

module.exports = {
  name: 'customcommandlist',
  description: 'List all custom commands in the server',
  category: 'config',
  aliases: ['cclist', 'customlist', 'listcc'],
  usage: '',
  examples: ['customcommandlist'],
  userPermissions: [],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('customcommandlist')
    .setDescription('List all custom commands in the server')
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
      
      // Get all custom commands for the guild
      const commands = await CustomCommand.find({ 
        guildID: interaction.guild.id 
      }).sort({ name: 1 }); // Sort alphabetically
      
      // Check if any commands exist
      if (commands.length === 0) {
        return interaction.reply({
          content: 'There are no custom commands in this server. Use `/customcommand` to create one!',
          ephemeral: true
        });
      }
      
      // Create pagination
      const commandsPerPage = 10;
      const totalPages = Math.ceil(commands.length / commandsPerPage);
      
      // Check if page is valid
      if (page > totalPages) {
        return interaction.reply({
          content: `Invalid page number. There are only ${totalPages} pages of custom commands.`,
          ephemeral: true
        });
      }
      
      // Get commands for the current page
      const startIndex = (page - 1) * commandsPerPage;
      const endIndex = Math.min(startIndex + commandsPerPage, commands.length);
      const currentPageCommands = commands.slice(startIndex, endIndex);
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle('Custom Commands')
        .setDescription(`Here are the custom commands for ${interaction.guild.name}:`)
        .setColor('#0099ff')
        .setFooter({ 
          text: `Page ${page}/${totalPages} • Total: ${commands.length} commands` 
        })
        .setTimestamp();
      
      // Add commands to embed
      if (currentPageCommands.length > 0) {
        const commandList = currentPageCommands.map((cmd, index) => {
          return `${startIndex + index + 1}. \`${cmd.name}\``;
        }).join('\\n');
        
        embed.addFields({
          name: 'Commands',
          value: commandList
        });
      }
      
      // Create pagination buttons
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`cclist_prev_${page}`)
            .setLabel('Previous')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page <= 1),
          new ButtonBuilder()
            .setCustomId(`cclist_next_${page}`)
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
                             (i.customId.startsWith('cclist_prev_') || 
                              i.customId.startsWith('cclist_next_'));
        
        const collector = interaction.channel.createMessageComponentCollector({ 
          filter, 
          time: 60000 
        });
        
        collector.on('collect', async i => {
          let newPage = page;
          
          if (i.customId.startsWith('cclist_prev_')) {
            newPage = page - 1;
          } else if (i.customId.startsWith('cclist_next_')) {
            newPage = page + 1;
          }
          
          // Create a new interaction to execute the command with the new page
          if (newPage !== page) {
            await i.deferUpdate();
            
            // Use the customcommandlist command with the new page
            const command = interaction.client.slashCommands.get('customcommandlist');
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
      logger.error(`Error in customcommandlist command: ${error}`);
      await interaction.reply({ 
        content: 'There was an error listing the custom commands!', 
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
      
      // Get all custom commands for the guild
      const commands = await CustomCommand.find({ 
        guildID: message.guild.id 
      }).sort({ name: 1 }); // Sort alphabetically
      
      // Check if any commands exist
      if (commands.length === 0) {
        return message.reply('There are no custom commands in this server. Use the `customcommand` command to create one!');
      }
      
      // Create pagination
      const commandsPerPage = 10;
      const totalPages = Math.ceil(commands.length / commandsPerPage);
      
      // Check if page is valid
      if (page > totalPages) {
        return message.reply(`Invalid page number. There are only ${totalPages} pages of custom commands.`);
      }
      
      // Get commands for the current page
      const startIndex = (page - 1) * commandsPerPage;
      const endIndex = Math.min(startIndex + commandsPerPage, commands.length);
      const currentPageCommands = commands.slice(startIndex, endIndex);
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle('Custom Commands')
        .setDescription(`Here are the custom commands for ${message.guild.name}:`)
        .setColor('#0099ff')
        .setFooter({ 
          text: `Page ${page}/${totalPages} • Total: ${commands.length} commands` 
        })
        .setTimestamp();
      
      // Add commands to embed
      if (currentPageCommands.length > 0) {
        const commandList = currentPageCommands.map((cmd, index) => {
          return `${startIndex + index + 1}. \`${cmd.name}\``;
        }).join('\\n');
        
        embed.addFields({
          name: 'Commands',
          value: commandList
        });
      }
      
      // Create pagination buttons
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`cclist_prev_${page}`)
            .setLabel('Previous')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page <= 1),
          new ButtonBuilder()
            .setCustomId(`cclist_next_${page}`)
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
                             (i.customId.startsWith('cclist_prev_') || 
                              i.customId.startsWith('cclist_next_'));
        
        const collector = response.createMessageComponentCollector({ 
          filter, 
          time: 60000 
        });
        
        collector.on('collect', async i => {
          let newPage = page;
          
          if (i.customId.startsWith('cclist_prev_')) {
            newPage = page - 1;
          } else if (i.customId.startsWith('cclist_next_')) {
            newPage = page + 1;
          }
          
          if (newPage !== page) {
            await i.deferUpdate();
            
            // Recursive call with the new page
            const command = client.commands.get('customcommandlist');
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
      logger.error(`Error in legacy customcommandlist command: ${error}`);
      message.reply('There was an error listing the custom commands!');
    }
  }
};