const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const { readdirSync } = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Display help information for commands')
    .addStringOption(option => 
      option.setName('command')
        .setDescription('Get help for a specific command')
        .setRequired(false)),
  
  category: 'information',
  usage: '/help [command]',
  examples: ['/help', '/help ping', '/help ban'],
  aliases: ['commands', 'cmds', 'h'],
  
  /**
   * Execute the command - Slash Command
   * @param {*} interaction - The interaction object
   */
  async execute(interaction) {
    const client = interaction.client;
    const commandName = interaction.options.getString('command');
    
    if (commandName) {
      return this.displayCommandHelp(interaction, commandName);
    }
    
    // Get categories
    const categories = this.getCategories();
    const mainEmbed = this.createMainEmbed(interaction, categories);
    
    // Create select menu for categories
    const row = new ActionRowBuilder()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('help_category')
          .setPlaceholder('Select a category')
          .addOptions(categories.map(category => ({
            label: this.capitalizeFirstLetter(category),
            description: `View ${category} commands`,
            value: category
          })))
      );
    
    const response = await interaction.reply({ embeds: [mainEmbed], components: [row], fetchReply: true });
    
    // Create collector for select menu
    const collector = response.createMessageComponentCollector({ 
      componentType: ComponentType.StringSelect, 
      time: 60000 
    });
    
    collector.on('collect', async i => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({ content: 'This help menu is not for you!', ephemeral: true });
      }
      
      const categoryName = i.values[0];
      const categoryEmbed = this.createCategoryEmbed(interaction, categoryName);
      
      await i.update({ embeds: [categoryEmbed], components: [row] });
    });
    
    collector.on('end', async () => {
      // Disable the select menu when time expires
      const disabledRow = new ActionRowBuilder()
        .addComponents(
          StringSelectMenuBuilder.from(row.components[0]).setDisabled(true)
        );
      
      await response.edit({ components: [disabledRow] }).catch(() => {});
    });
  },
  
  /**
   * Execute the command - Legacy Command
   * @param {*} message - The message object
   * @param {string[]} args - The message arguments
   * @param {*} client - The client object
   */
  async run(message, args, client) {
    if (args[0]) {
      return this.displayCommandHelpLegacy(message, args[0], client);
    }
    
    // Get categories
    const categories = this.getCategories();
    const mainEmbed = this.createMainEmbedLegacy(message, categories);
    
    // Create select menu for categories
    const row = new ActionRowBuilder()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('help_category')
          .setPlaceholder('Select a category')
          .addOptions(categories.map(category => ({
            label: this.capitalizeFirstLetter(category),
            description: `View ${category} commands`,
            value: category
          })))
      );
    
    const response = await message.channel.send({ embeds: [mainEmbed], components: [row] });
    
    // Create collector for select menu
    const collector = response.createMessageComponentCollector({ 
      componentType: ComponentType.StringSelect, 
      time: 60000 
    });
    
    collector.on('collect', async i => {
      if (i.user.id !== message.author.id) {
        return i.reply({ content: 'This help menu is not for you!', ephemeral: true });
      }
      
      const categoryName = i.values[0];
      const categoryEmbed = this.createCategoryEmbedLegacy(message, categoryName, client);
      
      await i.update({ embeds: [categoryEmbed], components: [row] });
    });
    
    collector.on('end', async () => {
      // Disable the select menu when time expires
      const disabledRow = new ActionRowBuilder()
        .addComponents(
          StringSelectMenuBuilder.from(row.components[0]).setDisabled(true)
        );
      
      await response.edit({ components: [disabledRow] }).catch(() => {});
    });
  },
  
  /**
   * Display help for a specific command (slash command)
   * @param {*} interaction - The interaction object
   * @param {string} commandName - The command name
   */
  async displayCommandHelp(interaction, commandName) {
    const command = interaction.client.commands.get(commandName) ||
                   interaction.client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
    
    if (!command) {
      return interaction.reply({ 
        content: `Command \`${commandName}\` not found. Use \`/help\` to see all commands.`, 
        ephemeral: true 
      });
    }
    
    const embed = new EmbedBuilder()
      .setTitle(`Command: ${command.data.name}`)
      .setDescription(command.data.description)
      .setColor(interaction.guild.members.me.displayHexColor)
      .addFields(
        { name: 'Category', value: this.capitalizeFirstLetter(command.category || 'No category'), inline: true },
        { name: 'Usage', value: `\`${command.usage || command.data.name}\``, inline: true },
        { name: 'Aliases', value: command.aliases?.length ? command.aliases.map(a => `\`${a}\``).join(', ') : 'None', inline: true },
        { name: 'Examples', value: command.examples?.length ? command.examples.map(e => `\`${e}\``).join('\n') : 'No examples provided' }
      )
      .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
      .setTimestamp();
    
    return interaction.reply({ embeds: [embed] });
  },
  
  /**
   * Display help for a specific command (legacy command)
   * @param {*} message - The message object
   * @param {string} commandName - The command name
   * @param {*} client - The client object
   */
  async displayCommandHelpLegacy(message, commandName, client) {
    const command = client.commands.get(commandName) ||
                    client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
    
    if (!command) {
      return message.reply(`Command \`${commandName}\` not found. Use \`help\` to see all commands.`);
    }
    
    const embed = new EmbedBuilder()
      .setTitle(`Command: ${command.data ? command.data.name : command.name}`)
      .setDescription(command.data ? command.data.description : command.description)
      .setColor(message.guild.members.me.displayHexColor)
      .addFields(
        { name: 'Category', value: this.capitalizeFirstLetter(command.category || 'No category'), inline: true },
        { name: 'Usage', value: `\`${command.usage || (command.data ? command.data.name : command.name)}\``, inline: true },
        { name: 'Aliases', value: command.aliases?.length ? command.aliases.map(a => `\`${a}\``).join(', ') : 'None', inline: true },
        { name: 'Examples', value: command.examples?.length ? command.examples.map(e => `\`${e}\``).join('\n') : 'No examples provided' }
      )
      .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
      .setTimestamp();
    
    return message.channel.send({ embeds: [embed] });
  },
  
  /**
   * Create main help embed for slash commands
   * @param {*} interaction - The interaction object
   * @param {string[]} categories - The command categories
   * @returns {EmbedBuilder} The embed
   */
  createMainEmbed(interaction, categories) {
    return new EmbedBuilder()
      .setTitle('Aquire Bot Help')
      .setDescription('Use the dropdown menu below to browse command categories, or use `/help [command]` to get help for a specific command.')
      .setColor(interaction.guild.members.me.displayHexColor)
      .addFields(
        { name: 'Categories', value: categories.map(cat => `• ${this.capitalizeFirstLetter(cat)}`).join('\n') }
      )
      .setThumbnail(interaction.client.user.displayAvatarURL())
      .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
      .setTimestamp();
  },
  
  /**
   * Create main help embed for legacy commands
   * @param {*} message - The message object
   * @param {string[]} categories - The command categories
   * @returns {EmbedBuilder} The embed
   */
  createMainEmbedLegacy(message, categories) {
    return new EmbedBuilder()
      .setTitle('Aquire Bot Help')
      .setDescription('Use the dropdown menu below to browse command categories, or use `help [command]` to get help for a specific command.')
      .setColor(message.guild.members.me.displayHexColor)
      .addFields(
        { name: 'Categories', value: categories.map(cat => `• ${this.capitalizeFirstLetter(cat)}`).join('\n') }
      )
      .setThumbnail(message.client.user.displayAvatarURL())
      .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
      .setTimestamp();
  },
  
  /**
   * Create category embed for slash commands
   * @param {*} interaction - The interaction object
   * @param {string} categoryName - The category name
   * @returns {EmbedBuilder} The embed
   */
  createCategoryEmbed(interaction, categoryName) {
    const commands = this.getCategoryCommands(categoryName);
    
    return new EmbedBuilder()
      .setTitle(`${this.capitalizeFirstLetter(categoryName)} Commands`)
      .setDescription(`Here are all the ${categoryName} commands.\nUse \`/help [command]\` to get more info on a command.`)
      .setColor(interaction.guild.members.me.displayHexColor)
      .addFields(
        { name: 'Commands', value: commands.map(cmd => `• **${cmd.name}** - ${cmd.description}`).join('\n') || 'No commands in this category.' }
      )
      .setThumbnail(interaction.client.user.displayAvatarURL())
      .setFooter({ text: `Requested by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
      .setTimestamp();
  },
  
  /**
   * Create category embed for legacy commands
   * @param {*} message - The message object
   * @param {string} categoryName - The category name
   * @param {*} client - The client object
   * @returns {EmbedBuilder} The embed
   */
  createCategoryEmbedLegacy(message, categoryName, client) {
    const commands = this.getCategoryCommands(categoryName);
    
    return new EmbedBuilder()
      .setTitle(`${this.capitalizeFirstLetter(categoryName)} Commands`)
      .setDescription(`Here are all the ${categoryName} commands.\nUse \`help [command]\` to get more info on a command.`)
      .setColor(message.guild.members.me.displayHexColor)
      .addFields(
        { name: 'Commands', value: commands.map(cmd => `• **${cmd.name}** - ${cmd.description}`).join('\n') || 'No commands in this category.' }
      )
      .setThumbnail(client.user.displayAvatarURL())
      .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
      .setTimestamp();
  },
  
  /**
   * Get a list of command categories
   * @returns {string[]} Array of category names
   */
  getCategories() {
    try {
      const foldersPath = path.join(__dirname, '../');
      const commandFolders = readdirSync(foldersPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
        
      return commandFolders;
    } catch (error) {
      console.error('Error getting command categories:', error);
      return ['information', 'moderation', 'utility', 'fun'];
    }
  },
  
  /**
   * Get commands for a specific category
   * @param {string} categoryName - The category name
   * @returns {Array} Array of command objects
   */
  getCategoryCommands(categoryName) {
    try {
      const commands = [];
      const commandsPath = path.join(__dirname, `../${categoryName}`);
      const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));
      
      for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        
        commands.push({
          name: command.data ? command.data.name : file.replace('.js', ''),
          description: command.data ? command.data.description : command.description || 'No description provided'
        });
      }
      
      return commands;
    } catch (error) {
      console.error(`Error getting commands for category ${categoryName}:`, error);
      return [];
    }
  },
  
  /**
   * Capitalize the first letter of a string
   * @param {string} string - The string to capitalize
   * @returns {string} The capitalized string
   */
  capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
};