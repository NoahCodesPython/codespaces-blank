const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ComponentType
} = require('discord.js');
const { readdirSync } = require('fs');
const path = require('path');
const logger = require('../../utils/logger');

module.exports = {
  name: 'help',
  description: 'Display a list of all commands or info about a specific command',
  category: 'information',
  aliases: ['commands', 'h', 'cmds'],
  usage: '[command]',
  examples: ['help', 'help ban'],
  userPermissions: [],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Display a list of all commands or info about a specific command')
    .addStringOption(option => 
      option.setName('command')
        .setDescription('Get help for a specific command')
        .setRequired(false)),
  
  // Slash command execution
  async execute(interaction) {
    try {
      const commandName = interaction.options.getString('command');
      
      // If no command specified, show all commands
      if (!commandName) {
        return await sendCommandList(interaction);
      }
      
      // Find the command
      const command = interaction.client.slashCommands.get(commandName) || 
                      interaction.client.slashCommands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
      
      if (!command) {
        return interaction.reply({
          content: `Could not find command \`${commandName}\`.`,
          ephemeral: true
        });
      }
      
      // Send command info
      await sendCommandInfo(interaction, command);
      
    } catch (error) {
      logger.error(`Error executing help command: ${error}`);
      await interaction.reply({ 
        content: 'There was an error executing this command!', 
        ephemeral: true 
      });
    }
  },
  
  // Legacy command execution
  async run(client, message, args) {
    try {
      const commandName = args[0];
      
      // If no command specified, show all commands
      if (!commandName) {
        return await legacySendCommandList(message, client);
      }
      
      // Find the command
      const command = client.commands.get(commandName) || 
                      client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
      
      if (!command) {
        return message.reply(`Could not find command \`${commandName}\`.`);
      }
      
      // Send command info
      await legacySendCommandInfo(message, command);
      
    } catch (error) {
      logger.error(`Error executing help command: ${error}`);
      message.reply('There was an error executing this command!');
    }
  }
};

// Function to send command list (slash command)
async function sendCommandList(interaction) {
  // Get all command categories
  const categories = {};
  const commandsDir = path.join(__dirname, '../..');
  const commandFolders = readdirSync(path.join(commandsDir, 'commands'));
  
  // Get all commands in each category (excluding owner commands)
  for (const folder of commandFolders) {
    // Skip the owner category
    if (folder.toLowerCase() === 'owner') continue;
    
    const categoryCommands = [];
    
    // Read command files in each category folder
    const commandFiles = readdirSync(path.join(commandsDir, 'commands', folder)).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
      const command = require(`../../commands/${folder}/${file}`);
      if (command.name && command.description) {
        categoryCommands.push({
          name: command.name,
          description: command.description
        });
      }
    }
    
    if (categoryCommands.length) {
      categories[folder.charAt(0).toUpperCase() + folder.slice(1)] = categoryCommands;
    }
  }
  
  // Get guild name and icon
  const guildName = interaction.guild ? interaction.guild.name : 'Direct Message';
  const guildIcon = interaction.guild ? interaction.guild.iconURL({ dynamic: true }) : null;
  
  // Create the main embed with a more attractive design
  const embed = new EmbedBuilder()
    .setTitle('🤖 Aquire Bot Command Center')
    .setDescription('Welcome to Aquire Bot! Use the dropdown menu below to browse commands by category.\n\n**Command Usage:** `/command [options]`\n**Get Detailed Help:** `/help command_name`')
    .setColor('#5865F2') // Discord blurple color
    .setThumbnail(interaction.client.user.displayAvatarURL({ dynamic: true, size: 256 }))
    .setAuthor({ 
      name: `Requested by ${interaction.user.tag}`, 
      iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
    })
    .setFooter({ 
      text: `Serving ${guildName} • ${interaction.client.slashCommands.size} Total Commands`,
      iconURL: guildIcon
    })
    .setTimestamp();
  
  // Add categories to embed with emoji icons for each category
  const categoryEmojis = {
    'Altdetector': '🔍',
    'Applications': '📝',
    'Config': '⚙️',
    'Economy': '💰',
    'Fun': '🎮',
    'Information': 'ℹ️',
    'Moderation': '🛡️',
    'Reactionrole': '🎭',
    'Ticket': '🎫',
    'Utility': '🛠️'
  };
  
  // Create category dropdown
  const categorySelect = new StringSelectMenuBuilder()
    .setCustomId('help_category_select')
    .setPlaceholder('Select a command category')
    .setMinValues(1)
    .setMaxValues(1);
  
  // Add all categories to the dropdown
  Object.keys(categories).forEach(category => {
    const emoji = categoryEmojis[category] || '📌';
    const commandCount = categories[category].length;
    
    categorySelect.addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(category)
        .setDescription(`${commandCount} commands available`)
        .setValue(category.toLowerCase())
        .setEmoji(emoji)
    );
  });
  
  // Create buttons row
  const buttonsRow = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setLabel('🌐 Support Server')
        .setStyle(ButtonStyle.Link)
        .setURL('https://discord.gg/example'),
      new ButtonBuilder()
        .setLabel('➕ Invite Bot')
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/api/oauth2/authorize?client_id=${interaction.client.user.id}&permissions=8&scope=bot%20applications.commands`),
      new ButtonBuilder()
        .setLabel('📋 Command List')
        .setStyle(ButtonStyle.Link)
        .setURL('https://docs.aquirebot.com/commands')
    );
  
  // Create dropdown row
  const selectRow = new ActionRowBuilder().addComponents(categorySelect);
  
  // Send the embed with the dropdown and buttons
  const response = await interaction.reply({ 
    embeds: [embed], 
    components: [selectRow, buttonsRow],
    fetchReply: true
  });
  
  // Create a collector for dropdown interactions
  const collector = response.createMessageComponentCollector({
    componentType: ComponentType.StringSelect,
    time: 5 * 60 * 1000 // 5 minutes
  });
  
  collector.on('collect', async i => {
    // Ensure the interaction is from the original user
    if (i.user.id !== interaction.user.id) {
      return i.reply({
        content: 'This menu is not for you!',
        ephemeral: true
      });
    }
    
    const selectedCategory = i.values[0];
    const formattedCategory = selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1);
    const emoji = categoryEmojis[formattedCategory] || '📌';
    
    // Get commands for the selected category
    const commandList = categories[formattedCategory];
    
    // Create a new embed for the category
    const categoryEmbed = new EmbedBuilder()
      .setTitle(`${emoji} ${formattedCategory} Commands`)
      .setDescription(`Here are all the commands in the ${formattedCategory} category:`)
      .setColor('#5865F2')
      .setFooter({ 
        text: `${commandList.length} commands • Select another category from the dropdown`, 
        iconURL: interaction.client.user.displayAvatarURL() 
      })
      .setTimestamp();
    
    // Add all commands to the embed (no summarization)
    const commands = commandList.map(cmd => `> **\`/${cmd.name}\`** • ${cmd.description}`);
    
    // Split commands into groups of 15 to avoid reaching the field value character limit
    const chunkedCommands = [];
    for (let i = 0; i < commands.length; i += 15) {
      chunkedCommands.push(commands.slice(i, i + 15));
    }
    
    // Add each chunk as a separate field
    chunkedCommands.forEach((chunk, index) => {
      categoryEmbed.addFields({
        name: index === 0 ? 'Commands' : '\u200B', // Empty character for additional fields
        value: chunk.join('\n'),
        inline: false
      });
    });
    
    // Create a command select menu for this category
    const commandSelect = new StringSelectMenuBuilder()
      .setCustomId('help_command_select')
      .setPlaceholder('Select a command for details')
      .setMinValues(1)
      .setMaxValues(1);
    
    // Add command options to the select menu
    commandList.forEach(cmd => {
      commandSelect.addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel(`/${cmd.name}`)
          .setDescription(cmd.description.length > 100 
            ? cmd.description.substring(0, 97) + '...' 
            : cmd.description)
          .setValue(cmd.name)
      );
    });
    
    // Create a new row with the command select menu
    const commandSelectRow = new ActionRowBuilder().addComponents(commandSelect);
    
    // Update the message with the new embed and select menu
    await i.update({ 
      embeds: [categoryEmbed], 
      components: [selectRow, commandSelectRow, buttonsRow] 
    });
  });
  
  // Create a collector for command selection
  const commandCollector = response.createMessageComponentCollector({
    componentType: ComponentType.StringSelect,
    filter: i => i.customId === 'help_command_select',
    time: 5 * 60 * 1000 // 5 minutes
  });
  
  commandCollector.on('collect', async i => {
    // Ensure the interaction is from the original user
    if (i.user.id !== interaction.user.id) {
      return i.reply({
        content: 'This menu is not for you!',
        ephemeral: true
      });
    }
    
    const commandName = i.values[0];
    
    // Find the command in client's commands collection
    const command = interaction.client.slashCommands.get(commandName) || 
                    interaction.client.slashCommands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
    
    if (!command) {
      return i.reply({
        content: `Could not find command \`${commandName}\`.`,
        ephemeral: true
      });
    }
    
    // Send command info as a follow-up
    await sendCommandInfoAsUpdate(i, command);
  });
  
  // Handle collector end
  collector.on('end', () => {
    // Disable dropdowns when time expires
    if (response.editable) {
      const disabledRow = new ActionRowBuilder().addComponents(
        categorySelect.setDisabled(true)
      );
      
      interaction.editReply({
        components: [disabledRow, buttonsRow]
      }).catch(() => {}); // Ignore errors if message was deleted
    }
  });
}

// Function to send command info (slash command)
async function sendCommandInfo(interaction, command) {
  const embed = createCommandInfoEmbed(command, interaction);
  
  // Send the embed with a tip about returning to the main help menu
  await interaction.reply({ 
    embeds: [embed],
    components: [
      new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('help_menu_return')
            .setLabel('Return to Help Menu')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('↩️')
        )
    ] 
  });
}

// Function to send command info as an update to an existing interaction
async function sendCommandInfoAsUpdate(interaction, command) {
  const embed = createCommandInfoEmbed(command, interaction);
  
  // Create back button
  const backButton = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('help_return_to_category')
        .setLabel('Return to Category')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('↩️')
    );
  
  // Update the interaction with command details
  await interaction.update({ 
    embeds: [embed],
    components: [backButton]
  });
  
  // Create a collector for the back button
  const filter = i => 
    i.customId === 'help_return_to_category' && 
    i.user.id === interaction.user.id;
  
  const collector = interaction.message.createMessageComponentCollector({ 
    filter, 
    time: 60000, 
    componentType: ComponentType.Button 
  });
  
  collector.on('collect', async i => {
    // Trigger the category selection again
    const categorySelectInteraction = {
      ...interaction,
      values: [command.category.toLowerCase()]
    };
    
    // Simulate selecting the category again
    const categoryCollector = interaction.message.components[0].components[0].options
      .find(option => option.value === command.category.toLowerCase());
    
    if (categoryCollector) {
      await i.deferUpdate(); // Acknowledge the interaction
      
      // Re-trigger category selection
      const selectedCategory = command.category.toLowerCase();
      const formattedCategory = selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1);
      
      // Get all command categories again (this code is duplicated from the main command)
      const categories = {};
      const commandsDir = path.join(__dirname, '../..');
      const commandFolders = readdirSync(path.join(commandsDir, 'commands'));
      
      // Re-populate the categories object
      for (const folder of commandFolders) {
        if (folder.toLowerCase() === 'owner') continue;
        
        const categoryCommands = [];
        const commandFiles = readdirSync(path.join(commandsDir, 'commands', folder))
          .filter(file => file.endsWith('.js'));
        
        for (const file of commandFiles) {
          const cmd = require(`../../commands/${folder}/${file}`);
          if (cmd.name && cmd.description) {
            categoryCommands.push({
              name: cmd.name,
              description: cmd.description
            });
          }
        }
        
        if (categoryCommands.length) {
          categories[folder.charAt(0).toUpperCase() + folder.slice(1)] = categoryCommands;
        }
      }
      
      // Reference to category emojis
      const categoryEmojis = {
        'Altdetector': '🔍',
        'Applications': '📝',
        'Config': '⚙️',
        'Economy': '💰',
        'Fun': '🎮',
        'Information': 'ℹ️',
        'Moderation': '🛡️',
        'Reactionrole': '🎭',
        'Ticket': '🎫',
        'Utility': '🛠️'
      };
      
      const emoji = categoryEmojis[formattedCategory] || '📌';
      const commandList = categories[formattedCategory];
      
      // Create category dropdown
      const categorySelect = new StringSelectMenuBuilder()
        .setCustomId('help_category_select')
        .setPlaceholder('Select a command category')
        .setMinValues(1)
        .setMaxValues(1);
      
      // Add all categories to the dropdown
      Object.keys(categories).forEach(category => {
        const catEmoji = categoryEmojis[category] || '📌';
        const commandCount = categories[category].length;
        
        categorySelect.addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel(category)
            .setDescription(`${commandCount} commands available`)
            .setValue(category.toLowerCase())
            .setEmoji(catEmoji)
        );
      });
      
      // Create category embed
      const categoryEmbed = new EmbedBuilder()
        .setTitle(`${emoji} ${formattedCategory} Commands`)
        .setDescription(`Here are all the commands in the ${formattedCategory} category:`)
        .setColor('#5865F2')
        .setFooter({ 
          text: `${commandList.length} commands • Select another category from the dropdown`, 
          iconURL: interaction.user.displayAvatarURL() 
        })
        .setTimestamp();
      
      // Add all commands to the embed
      const commands = commandList.map(cmd => `> **\`/${cmd.name}\`** • ${cmd.description}`);
      
      // Split commands into groups
      const chunkedCommands = [];
      for (let i = 0; i < commands.length; i += 15) {
        chunkedCommands.push(commands.slice(i, i + 15));
      }
      
      // Add each chunk as a separate field
      chunkedCommands.forEach((chunk, index) => {
        categoryEmbed.addFields({
          name: index === 0 ? 'Commands' : '\u200B',
          value: chunk.join('\n'),
          inline: false
        });
      });
      
      // Create a command select menu for this category
      const commandSelect = new StringSelectMenuBuilder()
        .setCustomId('help_command_select')
        .setPlaceholder('Select a command for details')
        .setMinValues(1)
        .setMaxValues(1);
      
      // Add command options to the select menu
      commandList.forEach(cmd => {
        commandSelect.addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel(`/${cmd.name}`)
            .setDescription(cmd.description.length > 100 
              ? cmd.description.substring(0, 97) + '...' 
              : cmd.description)
            .setValue(cmd.name)
        );
      });
      
      // Create rows
      const selectRow = new ActionRowBuilder().addComponents(categorySelect);
      const commandSelectRow = new ActionRowBuilder().addComponents(commandSelect);
      
      // Create buttons row
      const buttonsRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setLabel('🌐 Support Server')
            .setStyle(ButtonStyle.Link)
            .setURL('https://discord.gg/example'),
          new ButtonBuilder()
            .setLabel('➕ Invite Bot')
            .setStyle(ButtonStyle.Link)
            .setURL(`https://discord.com/api/oauth2/authorize?client_id=${interaction.user.id}&permissions=8&scope=bot%20applications.commands`),
          new ButtonBuilder()
            .setLabel('📋 Command List')
            .setStyle(ButtonStyle.Link)
            .setURL('https://docs.aquirebot.com/commands')
        );
      
      // Update with the category view
      await i.editReply({ 
        embeds: [categoryEmbed], 
        components: [selectRow, commandSelectRow, buttonsRow] 
      });
    }
  });
}

// Utility function to create command info embed
function createCommandInfoEmbed(command, interaction) {
  // Get category emoji
  const categoryEmojis = {
    'altdetector': '🔍',
    'applications': '📝',
    'config': '⚙️',
    'economy': '💰',
    'fun': '🎮',
    'information': 'ℹ️',
    'moderation': '🛡️',
    'reactionrole': '🎭',
    'ticket': '🎫',
    'utility': '🛠️'
  };
  
  const categoryEmoji = categoryEmojis[command.category?.toLowerCase()] || '📌';
  
  // Create a more visually appealing embed
  const embed = new EmbedBuilder()
    .setTitle(`${categoryEmoji} Command: ${command.name}`)
    .setDescription(command.description || 'No description available')
    .setColor('#5865F2')
    .setThumbnail(interaction.guild?.client.user.displayAvatarURL({ dynamic: true, size: 128 }))
    .setFooter({ 
      text: `Category: ${command.category || 'Uncategorized'} • Syntax: <> = required, [] = optional`,
      iconURL: interaction.user.displayAvatarURL({ dynamic: true })
    })
    .setTimestamp();
  
  // Add command details in a more structured format
  let commandSyntax = `/${command.name}`;
  if (command.usage) {
    commandSyntax += ` ${command.usage}`;
  }
  
  embed.addFields({ 
    name: '📋 Command Syntax', 
    value: `\`\`\`\n${commandSyntax}\n\`\`\`` 
  });
  
  // Add aliases if available
  if (command.aliases && command.aliases.length) {
    embed.addFields({ 
      name: '🔄 Aliases', 
      value: command.aliases.map(a => `\`${a}\``).join(', ') 
    });
  }
  
  // Add examples with better formatting
  if (command.examples && command.examples.length) {
    embed.addFields({ 
      name: '💡 Examples', 
      value: command.examples.map(example => `> \`/${example}\``).join('\n') 
    });
  }
  
  // Add required permissions with better formatting
  if (command.userPermissions && command.userPermissions.length) {
    const formattedPerms = command.userPermissions.map(perm => {
      return '`' + perm.toString().split(/(?=[A-Z])/).join(' ') + '`';
    }).join(', ');
    
    embed.addFields({ 
      name: '🔒 Required Permissions', 
      value: formattedPerms || 'None' 
    });
  }
  
  // Add cooldown information if available
  if (command.cooldown) {
    embed.addFields({ 
      name: '⏱️ Cooldown', 
      value: `${command.cooldown} seconds` 
    });
  }
  
  // Add additional notes about the command if available
  if (command.notes) {
    embed.addFields({ 
      name: '📝 Notes', 
      value: command.notes 
    });
  }
  
  return embed;
}

// Function to send command list (legacy command)
async function legacySendCommandList(message, client) {
  // Get guild prefix
  let prefix = '!'; // Default prefix
  
  try {
    const Guild = require('../../models/Guild');
    const guildSettings = await Guild.findOne({ guildID: message.guild.id });
    if (guildSettings && guildSettings.prefix) {
      prefix = guildSettings.prefix;
    }
  } catch (error) {
    logger.error(`Error fetching guild prefix: ${error}`);
  }
  
  // Get all command categories
  const categories = {};
  const commandsDir = path.join(__dirname, '../..');
  const commandFolders = readdirSync(path.join(commandsDir, 'commands'));
  
  // Get all commands in each category (excluding owner commands)
  for (const folder of commandFolders) {
    // Skip the owner category
    if (folder.toLowerCase() === 'owner') continue;
    
    const categoryCommands = [];
    
    // Read command files in each category folder
    const commandFiles = readdirSync(path.join(commandsDir, 'commands', folder)).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
      const command = require(`../../commands/${folder}/${file}`);
      if (command.name && command.description) {
        categoryCommands.push({
          name: command.name,
          description: command.description
        });
      }
    }
    
    if (categoryCommands.length) {
      categories[folder.charAt(0).toUpperCase() + folder.slice(1)] = categoryCommands;
    }
  }
  
  // Get guild name and icon
  const guildName = message.guild ? message.guild.name : 'Direct Message';
  const guildIcon = message.guild ? message.guild.iconURL({ dynamic: true }) : null;
  
  // Create the main embed
  const embed = new EmbedBuilder()
    .setTitle('🤖 Aquire Bot Command Center')
    .setDescription(`Welcome to Aquire Bot! Use the dropdown menu below to browse commands by category.\n\n**Command Usage:** \`${prefix}command [options]\`\n**Get Detailed Help:** \`${prefix}help command_name\`\n\n**Note:** Legacy command support is limited. Consider using slash commands for the best experience.`)
    .setColor('#5865F2')
    .setThumbnail(client.user.displayAvatarURL({ dynamic: true, size: 256 }))
    .setAuthor({ 
      name: `Requested by ${message.author.tag}`, 
      iconURL: message.author.displayAvatarURL({ dynamic: true }) 
    })
    .setFooter({ 
      text: `Serving ${guildName} • ${client.commands.size} Total Commands`,
      iconURL: guildIcon
    })
    .setTimestamp();
  
  // Create a sample category to show
  const firstCategory = Object.keys(categories)[0];
  const firstCategoryCommands = categories[firstCategory];
  const sampleCommands = firstCategoryCommands.map(cmd => `> **\`${prefix}${cmd.name}\`** • ${cmd.description}`).slice(0, 5);
  
  embed.addFields({
    name: `🔍 Sample Commands (${firstCategory})`,
    value: sampleCommands.join('\n') + `\n\n*Use the dropdown below to see all commands in each category*`
  });
  
  // Add links and support info with buttons
  const buttonsRow = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setLabel('🌐 Support Server')
        .setStyle(ButtonStyle.Link)
        .setURL('https://discord.gg/example'),
      new ButtonBuilder()
        .setLabel('➕ Invite Bot')
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`),
      new ButtonBuilder()
        .setLabel('📋 Command List')
        .setStyle(ButtonStyle.Link)
        .setURL('https://docs.aquirebot.com/commands')
    );
  
  // Send the initial embed
  await message.reply({ content: 'For the best experience, please use slash commands like `/help`', embeds: [embed], components: [buttonsRow] });
}

// Function to send command info (legacy command)
async function legacySendCommandInfo(message, command) {
  // Get guild prefix
  let prefix = '!'; // Default prefix
  
  try {
    const Guild = require('../../models/Guild');
    const guildSettings = await Guild.findOne({ guildID: message.guild.id });
    if (guildSettings && guildSettings.prefix) {
      prefix = guildSettings.prefix;
    }
  } catch (error) {
    logger.error(`Error fetching guild prefix: ${error}`);
  }
  
  // Get category emoji
  const categoryEmojis = {
    'altdetector': '🔍',
    'applications': '📝',
    'config': '⚙️',
    'economy': '💰',
    'fun': '🎮',
    'information': 'ℹ️',
    'moderation': '🛡️',
    'reactionrole': '🎭',
    'ticket': '🎫',
    'utility': '🛠️'
  };
  
  const categoryEmoji = categoryEmojis[command.category?.toLowerCase()] || '📌';
  
  // Create a more visually appealing embed
  const embed = new EmbedBuilder()
    .setTitle(`${categoryEmoji} Command: ${command.name}`)
    .setDescription(command.description || 'No description available')
    .setColor('#5865F2')
    .setFooter({ 
      text: `Category: ${command.category || 'Uncategorized'} • Syntax: <> = required, [] = optional`,
      iconURL: message.author.displayAvatarURL({ dynamic: true })
    })
    .setTimestamp();
  
  // Add command details in a more structured format
  let commandSyntax = `${prefix}${command.name}`;
  if (command.usage) {
    commandSyntax += ` ${command.usage}`;
  }
  
  embed.addFields({ 
    name: '📋 Command Syntax', 
    value: `\`\`\`\n${commandSyntax}\n\`\`\`` 
  });
  
  // Add aliases if available
  if (command.aliases && command.aliases.length) {
    embed.addFields({ 
      name: '🔄 Aliases', 
      value: command.aliases.map(a => `\`${a}\``).join(', ') 
    });
  }
  
  // Add examples with better formatting
  if (command.examples && command.examples.length) {
    embed.addFields({ 
      name: '💡 Examples', 
      value: command.examples.map(example => `> \`${prefix}${example}\``).join('\n') 
    });
  }
  
  // Add required permissions with better formatting
  if (command.userPermissions && command.userPermissions.length) {
    const formattedPerms = command.userPermissions.map(perm => {
      return '`' + perm.toString().split(/(?=[A-Z])/).join(' ') + '`';
    }).join(', ');
    
    embed.addFields({ 
      name: '🔒 Required Permissions', 
      value: formattedPerms || 'None' 
    });
  }
  
  // Add cooldown information if available
  if (command.cooldown) {
    embed.addFields({ 
      name: '⏱️ Cooldown', 
      value: `${command.cooldown} seconds` 
    });
  }
  
  // Add additional notes about the command if available
  if (command.notes) {
    embed.addFields({ 
      name: '📝 Notes', 
      value: command.notes 
    });
  }
  
  // Send the embed with a note about slash commands
  await message.reply({ 
    content: 'For the best experience, please use slash commands like `/help`',
    embeds: [embed]
  });
}