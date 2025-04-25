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
  
  // Organize commands by category
  for (const folder of commandFolders) {
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
  
  // Create the main embed
  const embed = new EmbedBuilder()
    .setTitle('Aquire Bot Commands')
    .setDescription('Here\'s a list of all available commands. Use `/help [command]` for more information about a specific command.')
    .setColor('#3498db')
    .setFooter({ text: `Total Commands: ${interaction.client.slashCommands.size}` })
    .setTimestamp();
  
  // Add categories to embed
  for (const [category, commands] of Object.entries(categories)) {
    embed.addFields({ 
      name: `${category} Commands`, 
      value: commands.slice(0, 10).join('\n') + (commands.length > 10 ? `\n...and ${commands.length - 10} more` : '') 
    });
  }
  
  // Add links and support info
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setLabel('Support Server')
        .setStyle(ButtonStyle.Link)
        .setURL('https://discord.gg/example'),
      new ButtonBuilder()
        .setLabel('Invite Bot')
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/api/oauth2/authorize?client_id=${interaction.client.user.id}&permissions=8&scope=bot%20applications.commands`)
    );
  
  // Send the embed
  await interaction.reply({ embeds: [embed], components: [row] });
}

// Function to send command info (slash command)
async function sendCommandInfo(interaction, command) {
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
    embed.addFields({ name: 'Usage', value: `\`/${command.name} ${command.usage}\`` });
  }
  
  if (command.examples && command.examples.length) {
    embed.addFields({ 
      name: 'Examples', 
      value: command.examples.map(example => `\`/${example}\``).join('\n') 
    });
  }
  
  if (command.userPermissions && command.userPermissions.length) {
    const formattedPerms = command.userPermissions.map(perm => {
      return perm.toString().split(/(?=[A-Z])/).join(' ');
    }).join(', ');
    
    embed.addFields({ name: 'Required Permissions', value: formattedPerms });
  }
  
  // Send the embed
  await interaction.reply({ embeds: [embed] });
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
  
  // Organize commands by category
  for (const folder of commandFolders) {
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
  
  // Create the main embed
  const embed = new EmbedBuilder()
    .setTitle('Aquire Bot Commands')
    .setDescription(`Here's a list of all available commands. Use \`${prefix}help [command]\` for more information about a specific command.`)
    .setColor('#3498db')
    .setFooter({ text: `Total Commands: ${client.commands.size}` })
    .setTimestamp();
  
  // Add categories to embed
  for (const [category, commands] of Object.entries(categories)) {
    embed.addFields({ 
      name: `${category} Commands`, 
      value: commands.slice(0, 10).join('\n') + (commands.length > 10 ? `\n...and ${commands.length - 10} more` : '') 
    });
  }
  
  // Add links and support info
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setLabel('Support Server')
        .setStyle(ButtonStyle.Link)
        .setURL('https://discord.gg/example'),
      new ButtonBuilder()
        .setLabel('Invite Bot')
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`)
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