const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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
  
  // Organize commands by category (excluding owner commands)
  for (const folder of commandFolders) {
    // Skip the owner category
    if (folder.toLowerCase() === 'owner') continue;
    
    const categoryCommands = [];
    
    // Read command files in each category folder
    const commandFiles = readdirSync(path.join(commandsDir, 'commands', folder)).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
      const command = require(`../../commands/${folder}/${file}`);
      if (command.name && command.description) {
        categoryCommands.push(`\`${command.name}\` - ${command.description}`);
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
    .setDescription('Welcome to Aquire Bot! Below you\'ll find all available commands organized by category.\n\n**Command Usage:** `/command [options]`\n**Get Detailed Help:** `/help command_name`')
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
  
  // Add categories to embed in a more visually appealing way
  for (const [category, commands] of Object.entries(categories)) {
    const emoji = categoryEmojis[category] || '📌';
    
    // Format the command list to look better
    const formattedCommands = commands.map(cmd => {
      // Extract name and description from the command string
      const match = cmd.match(/`(.+)` - (.+)/);
      if (match) {
        const [_, name, desc] = match;
        return `> \`${name}\` • ${desc}`;
      }
      return cmd;
    });
    
    // Add field for each category
    embed.addFields({ 
      name: `${emoji} ${category} Commands`, 
      value: formattedCommands.slice(0, 6).join('\n') + 
        (commands.length > 6 ? `\n> *...and ${commands.length - 6} more commands*` : '')
    });
  }
  
  // Add links and support info with improved buttons
  const row = new ActionRowBuilder()
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
  
  // Send the embed
  await interaction.reply({ embeds: [embed], components: [row] });
}

// Function to send command info (slash command)
async function sendCommandInfo(interaction, command) {
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
    .setThumbnail(interaction.client.user.displayAvatarURL({ dynamic: true, size: 128 }))
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
  
  // Organize commands by category (excluding owner commands)
  for (const folder of commandFolders) {
    // Skip the owner category
    if (folder.toLowerCase() === 'owner') continue;
    
    const categoryCommands = [];
    
    // Read command files in each category folder
    const commandFiles = readdirSync(path.join(commandsDir, 'commands', folder)).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
      const command = require(`../../commands/${folder}/${file}`);
      if (command.name && command.description) {
        categoryCommands.push(`\`${command.name}\` - ${command.description}`);
      }
    }
    
    if (categoryCommands.length) {
      categories[folder.charAt(0).toUpperCase() + folder.slice(1)] = categoryCommands;
    }
  }
  
  // Get guild name and icon
  const guildName = message.guild ? message.guild.name : 'Direct Message';
  const guildIcon = message.guild ? message.guild.iconURL({ dynamic: true }) : null;
  
  // Create the main embed with a more attractive design
  const embed = new EmbedBuilder()
    .setTitle('🤖 Aquire Bot Command Center')
    .setDescription(`Welcome to Aquire Bot! Below you'll find all available commands organized by category.\n\n**Command Usage:** \`${prefix}command [options]\`\n**Get Detailed Help:** \`${prefix}help command_name\``)
    .setColor('#5865F2') // Discord blurple color
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
  
  // Add categories to embed in a more visually appealing way
  for (const [category, commands] of Object.entries(categories)) {
    const emoji = categoryEmojis[category] || '📌';
    
    // Format the command list to look better
    const formattedCommands = commands.map(cmd => {
      // Extract name and description from the command string
      const match = cmd.match(/`(.+)` - (.+)/);
      if (match) {
        const [_, name, desc] = match;
        return `> \`${name}\` • ${desc}`;
      }
      return cmd;
    });
    
    // Add field for each category
    embed.addFields({ 
      name: `${emoji} ${category} Commands`, 
      value: formattedCommands.slice(0, 6).join('\n') + 
        (commands.length > 6 ? `\n> *...and ${commands.length - 6} more commands*` : '')
    });
  }
  
  // Add links and support info with improved buttons
  const row = new ActionRowBuilder()
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
  
  // Send the embed
  await message.reply({ embeds: [embed], components: [row] });
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
  
  const embed = new EmbedBuilder()
    .setTitle(`Command: ${command.name}`)
    .setDescription(command.description || 'No description available')
    .setColor('#3498db')
    .setFooter({ text: 'Syntax: <> = required, [] = optional' })
    .setTimestamp();
  
  // Add command details
  if (command.aliases && command.aliases.length) {
    embed.addFields({ name: 'Aliases', value: command.aliases.map(a => `\`${a}\``).join(', ') });
  }
  
  if (command.usage) {
    embed.addFields({ name: 'Usage', value: `\`${prefix}${command.name} ${command.usage}\`` });
  }
  
  if (command.examples && command.examples.length) {
    embed.addFields({ 
      name: 'Examples', 
      value: command.examples.map(example => `\`${prefix}${example}\``).join('\n') 
    });
  }
  
  if (command.userPermissions && command.userPermissions.length) {
    const formattedPerms = command.userPermissions.map(perm => {
      return perm.toString().split(/(?=[A-Z])/).join(' ');
    }).join(', ');
    
    embed.addFields({ name: 'Required Permissions', value: formattedPerms });
  }
  
  // Send the embed
  await message.reply({ embeds: [embed] });
}