const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isOwner, getOwners } = require('../../utils/ownerCheck');
const config = require('../../config');
const logger = require('../../utils/logger');

module.exports = {
  name: 'owners',
  description: 'Lists all bot owners',
  category: 'owner',
  aliases: ['listowners', 'botowners'],
  usage: '',
  examples: ['owners'],
  userPermissions: [],
  botPermissions: [],
  
  data: new SlashCommandBuilder()
    .setName('owners')
    .setDescription('Lists all bot owners'),
  
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
      
      // Defer reply as this might take a moment
      await interaction.deferReply();
      
      // Get all owners
      const owners = await getOwners();
      
      // Get the primary owner
      const primaryOwner = await interaction.client.users.fetch(config.ownerID).catch(() => null);
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle('Bot Owners')
        .setColor('#0099ff')
        .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      
      // Add primary owner to description
      let description = '**Primary Owner:**\n';
      description += primaryOwner ? `${primaryOwner.tag} (${primaryOwner.id})` : `Unknown User (${config.ownerID})`;
      description += '\n\n';
      
      // Add additional owners
      if (owners.length > 0) {
        description += '**Additional Owners:**\n';
        
        for (const owner of owners) {
          try {
            const user = await interaction.client.users.fetch(owner.userID);
            const addedBy = await interaction.client.users.fetch(owner.addedBy);
            
            description += `${user.tag} (${user.id})\n`;
            description += `┗ Added by: ${addedBy.tag}\n`;
            description += `┗ Added: <t:${Math.floor(owner.addedAt.getTime() / 1000)}:R>\n\n`;
          } catch (error) {
            description += `Unknown User (${owner.userID})\n`;
            description += `┗ Added by: Unknown User (${owner.addedBy})\n`;
            description += `┗ Added: <t:${Math.floor(owner.addedAt.getTime() / 1000)}:R>\n\n`;
          }
        }
      } else {
        description += '**Additional Owners:**\nNone';
      }
      
      embed.setDescription(description);
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error in owners command: ${error}`);
      
      if (interaction.deferred) {
        await interaction.editReply({ 
          content: 'There was an error retrieving the bot owners.'
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
      
      // Get all owners
      const owners = await getOwners();
      
      // Get the primary owner
      const primaryOwner = await client.users.fetch(config.ownerID).catch(() => null);
      
      // Create embed
      const embed = new EmbedBuilder()
        .setTitle('Bot Owners')
        .setColor('#0099ff')
        .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setTimestamp();
      
      // Add primary owner to description
      let description = '**Primary Owner:**\n';
      description += primaryOwner ? `${primaryOwner.tag} (${primaryOwner.id})` : `Unknown User (${config.ownerID})`;
      description += '\n\n';
      
      // Add additional owners
      if (owners.length > 0) {
        description += '**Additional Owners:**\n';
        
        for (const owner of owners) {
          try {
            const user = await client.users.fetch(owner.userID);
            const addedBy = await client.users.fetch(owner.addedBy);
            
            description += `${user.tag} (${user.id})\n`;
            description += `┗ Added by: ${addedBy.tag}\n`;
            description += `┗ Added: <t:${Math.floor(owner.addedAt.getTime() / 1000)}:R>\n\n`;
          } catch (error) {
            description += `Unknown User (${owner.userID})\n`;
            description += `┗ Added by: Unknown User (${owner.addedBy})\n`;
            description += `┗ Added: <t:${Math.floor(owner.addedAt.getTime() / 1000)}:R>\n\n`;
          }
        }
      } else {
        description += '**Additional Owners:**\nNone';
      }
      
      embed.setDescription(description);
      
      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      logger.error(`Error in legacy owners command: ${error}`);
      message.reply('There was an error retrieving the bot owners.');
    }
  }
};