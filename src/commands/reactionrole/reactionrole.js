const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const ReactionRole = require('../../models/reactionrole/ReactionRole');
const logger = require('../../utils/logger');

module.exports = {
  name: 'reactionrole',
  description: 'Create a new reaction role message',
  category: 'reactionrole',
  aliases: ['rr', 'rrole'],
  usage: '<title> <description>',
  examples: ['reactionrole "Role Selection" "Select your roles by reacting below"'],
  userPermissions: [PermissionFlagsBits.ManageRoles],
  botPermissions: [PermissionFlagsBits.ManageRoles],
  
  data: new SlashCommandBuilder()
    .setName('reactionrole')
    .setDescription('Create a new reaction role message')
    .addStringOption(option => 
      option.setName('title')
        .setDescription('Title for the reaction role message')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('description')
        .setDescription('Description for the reaction role message')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('type')
        .setDescription('Type of reaction role system')
        .setRequired(false)
        .addChoices(
          { name: 'Normal (Multiple roles)', value: 'normal' },
          { name: 'Unique (One role only)', value: 'unique' },
          { name: 'Verification', value: 'verification' }
        ))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  
  // Slash command execution
  async execute(interaction) {
    try {
      // Check permissions
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
        return interaction.reply({
          content: 'You need the **Manage Roles** permission to use this command!',
          ephemeral: true
        });
      }
      
      if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
        return interaction.reply({
          content: 'I need the **Manage Roles** permission to create reaction roles!',
          ephemeral: true
        });
      }
      
      // Get options
      const title = interaction.options.getString('title');
      const description = interaction.options.getString('description');
      const type = interaction.options.getString('type') || 'normal';
      
      // Create the reaction role embed
      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor('#3498db')
        .setFooter({ text: `Reaction Role Type: ${type.charAt(0).toUpperCase() + type.slice(1)}` })
        .setTimestamp();
      
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`rr-add-${interaction.id}`)
            .setLabel('Add Reaction Role')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`rr-publish-${interaction.id}`)
            .setLabel('Publish')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`rr-cancel-${interaction.id}`)
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Danger)
        );
      
      // Send the setup message
      const setupMessage = await interaction.reply({
        content: 'Setting up a new reaction role message. Use the buttons below to add roles and then publish it.',
        embeds: [embed],
        components: [row],
        fetchReply: true
      });
      
      // Store the current reactions in a temporary object
      interaction.client.reactionRoleSetups = interaction.client.reactionRoleSetups || new Map();
      interaction.client.reactionRoleSetups.set(interaction.id, {
        messageId: setupMessage.id,
        channelId: interaction.channelId,
        guildId: interaction.guildId,
        title,
        description,
        type,
        reactions: [],
        userId: interaction.user.id
      });
      
      // Set up a collector for the buttons
      const filter = i => 
        i.customId.startsWith(`rr-`) && 
        i.customId.endsWith(interaction.id) && 
        i.user.id === interaction.user.id;
      
      const collector = interaction.channel.createMessageComponentCollector({
        filter,
        time: 300000 // 5 minutes
      });
      
      collector.on('collect', async i => {
        // Get the setup data
        const setup = interaction.client.reactionRoleSetups.get(interaction.id);
        if (!setup) {
          return i.reply({
            content: 'This reaction role setup has expired. Please create a new one.',
            ephemeral: true
          });
        }
        
        if (i.customId === `rr-add-${interaction.id}`) {
          await i.reply({
            content: 'Please enter the role to add, followed by the emoji and an optional description, separated by a space.\n' +
                     'Example: `@Moderator 🛡️ Server moderator role`',
            ephemeral: true
          });
          
          // Create a message collector to wait for the role details
          const messageFilter = m => m.author.id === interaction.user.id;
          const messageCollector = interaction.channel.createMessageCollector({
            filter: messageFilter,
            max: 1,
            time: 60000 // 1 minute
          });
          
          messageCollector.on('collect', async message => {
            // Delete the message to keep the channel clean
            try {
              await message.delete();
            } catch (err) {
              logger.warn(`Could not delete message: ${err}`);
            }
            
            // Parse the message
            const args = message.content.trim().split(/ +/);
            
            if (args.length < 2) {
              return i.followUp({
                content: 'Invalid format. Please provide a role and an emoji.',
                ephemeral: true
              });
            }
            
            // Get the role
            const roleInput = args[0];
            let role;
            
            if (roleInput.startsWith('<@&') && roleInput.endsWith('>')) {
              // If it's a role mention
              const roleId = roleInput.slice(3, -1);
              role = await interaction.guild.roles.fetch(roleId);
            } else {
              // Try to find by ID or name
              role = await interaction.guild.roles.fetch(roleInput) || 
                     interaction.guild.roles.cache.find(r => r.name.toLowerCase() === roleInput.toLowerCase());
            }
            
            if (!role) {
              return i.followUp({
                content: 'Role not found. Please try again with a valid role mention or ID.',
                ephemeral: true
              });
            }
            
            // Check if the bot can manage this role
            if (role.position >= interaction.guild.members.me.roles.highest.position) {
              return i.followUp({
                content: 'I cannot assign this role as it is higher than or equal to my highest role. Please move my role above it in the server settings.',
                ephemeral: true
              });
            }
            
            // Get the emoji
            const emojiInput = args[1];
            let emoji = emojiInput;
            
            // If it's a custom emoji, extract the ID
            if (emojiInput.startsWith('<:') || emojiInput.startsWith('<a:')) {
              // Custom emoji format: <:name:id> or <a:name:id>
              const match = emojiInput.match(/<(?:a)?:(\w+):(\d+)>/);
              if (match) {
                const emojiName = match[1];
                const emojiId = match[2];
                emoji = emojiInput.startsWith('<:') ? `<:${emojiName}:${emojiId}>` : `<a:${emojiName}:${emojiId}>`;
              } else {
                return i.followUp({
                  content: 'Invalid emoji format. Please try again with a valid emoji.',
                  ephemeral: true
                });
              }
            }
            
            // Get the description (optional)
            const description = args.slice(2).join(' ');
            
            // Add the reaction to the setup
            setup.reactions.push({
              emoji: emoji,
              roleID: role.id,
              roleDescription: description
            });
            
            // Update the embed description to include the new role
            const roleDescriptionText = description ? ` - ${description}` : '';
            const newDescription = setup.description + 
                                  (setup.reactions.length === 1 ? '\n\n**Roles:**\n' : '\n') + 
                                  `${emoji} <@&${role.id}>${roleDescriptionText}`;
            
            const updatedEmbed = EmbedBuilder.from(setupMessage.embeds[0])
              .setDescription(newDescription);
            
            // Update the message
            await setupMessage.edit({
              embeds: [updatedEmbed]
            });
            
            // Update the setup in the client
            setup.description = newDescription;
            interaction.client.reactionRoleSetups.set(interaction.id, setup);
            
            await i.followUp({
              content: `Added role ${role.name} with emoji ${emoji}${description ? ` and description "${description}"` : ''}`,
              ephemeral: true
            });
          });
          
          messageCollector.on('end', (collected, reason) => {
            if (reason === 'time' && collected.size === 0) {
              i.followUp({
                content: 'You did not provide any role details in time. Please try again.',
                ephemeral: true
              });
            }
          });
          
        } else if (i.customId === `rr-publish-${interaction.id}`) {
          // Check if any roles have been added
          if (setup.reactions.length === 0) {
            return i.reply({
              content: 'You must add at least one reaction role before publishing!',
              ephemeral: true
            });
          }
          
          // Create the final embed
          const finalEmbed = new EmbedBuilder()
            .setTitle(setup.title)
            .setDescription(setup.description)
            .setColor('#3498db')
            .setFooter({ text: `React to get roles | Type: ${setup.type.charAt(0).toUpperCase() + setup.type.slice(1)}` })
            .setTimestamp();
          
          // Send the final message
          const finalMessage = await interaction.channel.send({
            embeds: [finalEmbed]
          });
          
          // Add the reactions to the message
          for (const reaction of setup.reactions) {
            try {
              // If it's a custom emoji, we need to extract the ID
              if (reaction.emoji.startsWith('<:') || reaction.emoji.startsWith('<a:')) {
                const match = reaction.emoji.match(/<(?:a)?:(\w+):(\d+)>/);
                if (match) {
                  const emojiId = match[2];
                  await finalMessage.react(emojiId);
                }
              } else {
                await finalMessage.react(reaction.emoji);
              }
            } catch (err) {
              logger.error(`Failed to add reaction ${reaction.emoji}: ${err}`);
            }
          }
          
          // Save the reaction role configuration to the database
          const reactionRole = new ReactionRole({
            messageID: finalMessage.id,
            channelID: interaction.channelId,
            guildID: interaction.guildId,
            reactions: setup.reactions,
            type: setup.type
          });
          
          await reactionRole.save();
          
          // Remove the setup data
          interaction.client.reactionRoleSetups.delete(interaction.id);
          
          // End the collector
          collector.stop();
          
          // Delete the setup message
          try {
            await setupMessage.delete();
          } catch (err) {
            logger.warn(`Could not delete setup message: ${err}`);
          }
          
          await i.reply({
            content: 'Reaction role message published successfully!',
            ephemeral: true
          });
          
        } else if (i.customId === `rr-cancel-${interaction.id}`) {
          // Remove the setup data
          interaction.client.reactionRoleSetups.delete(interaction.id);
          
          // End the collector
          collector.stop();
          
          // Delete the setup message
          try {
            await setupMessage.delete();
          } catch (err) {
            logger.warn(`Could not delete setup message: ${err}`);
          }
          
          await i.reply({
            content: 'Reaction role setup cancelled.',
            ephemeral: true
          });
        }
      });
      
      collector.on('end', async (collected, reason) => {
        if (reason === 'time') {
          // Remove the setup data
          interaction.client.reactionRoleSetups.delete(interaction.id);
          
          // Try to delete the setup message
          try {
            await setupMessage.delete();
          } catch (err) {
            // If the message has already been deleted, just ignore
            if (err.code !== 10008) {
              logger.warn(`Could not delete setup message: ${err}`);
            }
          }
        }
      });
      
    } catch (error) {
      logger.error(`Error executing reactionrole command: ${error}`);
      
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({
          content: 'There was an error setting up the reaction role!',
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
      // Check permissions
      if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
        return message.reply('You need the **Manage Roles** permission to use this command!');
      }
      
      if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
        return message.reply('I need the **Manage Roles** permission to create reaction roles!');
      }
      
      // Check if any arguments were provided
      if (!args.length) {
        return message.reply('Please provide a title and description for the reaction role message!\nUsage: `reactionrole "Title" "Description" [type]`');
      }
      
      // Parse the arguments
      let title, description, type = 'normal';
      
      // Check if the first argument is wrapped in quotes
      if (args[0].startsWith('"')) {
        // Find the closing quote
        const titleText = args.join(' ');
        const titleEnd = titleText.indexOf('"', 1);
        
        if (titleEnd === -1) {
          return message.reply('Invalid format. Please wrap the title in quotes!');
        }
        
        title = titleText.substring(1, titleEnd);
        
        // Find the description
        const descStart = titleText.indexOf('"', titleEnd + 1);
        
        if (descStart === -1) {
          return message.reply('Invalid format. Please provide a description wrapped in quotes!');
        }
        
        const descEnd = titleText.indexOf('"', descStart + 1);
        
        if (descEnd === -1) {
          return message.reply('Invalid format. Please wrap the description in quotes!');
        }
        
        description = titleText.substring(descStart + 1, descEnd);
        
        // Check if there's a type argument
        if (descEnd + 1 < titleText.length) {
          const remainingText = titleText.substring(descEnd + 1).trim();
          
          if (['normal', 'unique', 'verification'].includes(remainingText.toLowerCase())) {
            type = remainingText.toLowerCase();
          }
        }
      } else {
        // No quotes, assume first argument is title and second is description
        if (args.length < 2) {
          return message.reply('Please provide both a title and description for the reaction role message!');
        }
        
        title = args[0];
        description = args[1];
        
        if (args.length > 2 && ['normal', 'unique', 'verification'].includes(args[2].toLowerCase())) {
          type = args[2].toLowerCase();
        }
      }
      
      // Create the reaction role embed
      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor('#3498db')
        .setFooter({ text: `Reaction Role Type: ${type.charAt(0).toUpperCase() + type.slice(1)}` })
        .setTimestamp();
      
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`rr-add-${message.id}`)
            .setLabel('Add Reaction Role')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`rr-publish-${message.id}`)
            .setLabel('Publish')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`rr-cancel-${message.id}`)
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Danger)
        );
      
      // Send the setup message
      const setupMessage = await message.reply({
        content: 'Setting up a new reaction role message. Use the buttons below to add roles and then publish it.',
        embeds: [embed],
        components: [row]
      });
      
      // Store the current reactions in a temporary object
      client.reactionRoleSetups = client.reactionRoleSetups || new Map();
      client.reactionRoleSetups.set(message.id, {
        messageId: setupMessage.id,
        channelId: message.channelId,
        guildId: message.guildId,
        title,
        description,
        type,
        reactions: [],
        userId: message.author.id
      });
      
      // Set up a collector for the buttons
      const filter = i => 
        i.customId.startsWith(`rr-`) && 
        i.customId.endsWith(message.id) && 
        i.user.id === message.author.id;
      
      const collector = message.channel.createMessageComponentCollector({
        filter,
        time: 300000 // 5 minutes
      });
      
      collector.on('collect', async i => {
        // Get the setup data
        const setup = client.reactionRoleSetups.get(message.id);
        if (!setup) {
          return i.reply({
            content: 'This reaction role setup has expired. Please create a new one.',
            ephemeral: true
          });
        }
        
        if (i.customId === `rr-add-${message.id}`) {
          await i.reply({
            content: 'Please enter the role to add, followed by the emoji and an optional description, separated by a space.\n' +
                     'Example: `@Moderator 🛡️ Server moderator role`',
            ephemeral: true
          });
          
          // Create a message collector to wait for the role details
          const messageFilter = m => m.author.id === message.author.id;
          const messageCollector = message.channel.createMessageCollector({
            filter: messageFilter,
            max: 1,
            time: 60000 // 1 minute
          });
          
          messageCollector.on('collect', async msg => {
            // Delete the message to keep the channel clean
            try {
              await msg.delete();
            } catch (err) {
              logger.warn(`Could not delete message: ${err}`);
            }
            
            // Parse the message
            const args = msg.content.trim().split(/ +/);
            
            if (args.length < 2) {
              return i.followUp({
                content: 'Invalid format. Please provide a role and an emoji.',
                ephemeral: true
              });
            }
            
            // Get the role
            const roleInput = args[0];
            let role;
            
            if (roleInput.startsWith('<@&') && roleInput.endsWith('>')) {
              // If it's a role mention
              const roleId = roleInput.slice(3, -1);
              role = await message.guild.roles.fetch(roleId);
            } else {
              // Try to find by ID or name
              role = await message.guild.roles.fetch(roleInput) || 
                     message.guild.roles.cache.find(r => r.name.toLowerCase() === roleInput.toLowerCase());
            }
            
            if (!role) {
              return i.followUp({
                content: 'Role not found. Please try again with a valid role mention or ID.',
                ephemeral: true
              });
            }
            
            // Check if the bot can manage this role
            if (role.position >= message.guild.members.me.roles.highest.position) {
              return i.followUp({
                content: 'I cannot assign this role as it is higher than or equal to my highest role. Please move my role above it in the server settings.',
                ephemeral: true
              });
            }
            
            // Get the emoji
            const emojiInput = args[1];
            let emoji = emojiInput;
            
            // If it's a custom emoji, extract the ID
            if (emojiInput.startsWith('<:') || emojiInput.startsWith('<a:')) {
              // Custom emoji format: <:name:id> or <a:name:id>
              const match = emojiInput.match(/<(?:a)?:(\w+):(\d+)>/);
              if (match) {
                const emojiName = match[1];
                const emojiId = match[2];
                emoji = emojiInput.startsWith('<:') ? `<:${emojiName}:${emojiId}>` : `<a:${emojiName}:${emojiId}>`;
              } else {
                return i.followUp({
                  content: 'Invalid emoji format. Please try again with a valid emoji.',
                  ephemeral: true
                });
              }
            }
            
            // Get the description (optional)
            const description = args.slice(2).join(' ');
            
            // Add the reaction to the setup
            setup.reactions.push({
              emoji: emoji,
              roleID: role.id,
              roleDescription: description
            });
            
            // Update the embed description to include the new role
            const roleDescriptionText = description ? ` - ${description}` : '';
            const newDescription = setup.description + 
                                  (setup.reactions.length === 1 ? '\n\n**Roles:**\n' : '\n') + 
                                  `${emoji} <@&${role.id}>${roleDescriptionText}`;
            
            const updatedEmbed = EmbedBuilder.from(setupMessage.embeds[0])
              .setDescription(newDescription);
            
            // Update the message
            await setupMessage.edit({
              embeds: [updatedEmbed]
            });
            
            // Update the setup in the client
            setup.description = newDescription;
            client.reactionRoleSetups.set(message.id, setup);
            
            await i.followUp({
              content: `Added role ${role.name} with emoji ${emoji}${description ? ` and description "${description}"` : ''}`,
              ephemeral: true
            });
          });
          
          messageCollector.on('end', (collected, reason) => {
            if (reason === 'time' && collected.size === 0) {
              i.followUp({
                content: 'You did not provide any role details in time. Please try again.',
                ephemeral: true
              });
            }
          });
          
        } else if (i.customId === `rr-publish-${message.id}`) {
          // Check if any roles have been added
          if (setup.reactions.length === 0) {
            return i.reply({
              content: 'You must add at least one reaction role before publishing!',
              ephemeral: true
            });
          }
          
          // Create the final embed
          const finalEmbed = new EmbedBuilder()
            .setTitle(setup.title)
            .setDescription(setup.description)
            .setColor('#3498db')
            .setFooter({ text: `React to get roles | Type: ${setup.type.charAt(0).toUpperCase() + setup.type.slice(1)}` })
            .setTimestamp();
          
          // Send the final message
          const finalMessage = await message.channel.send({
            embeds: [finalEmbed]
          });
          
          // Add the reactions to the message
          for (const reaction of setup.reactions) {
            try {
              // If it's a custom emoji, we need to extract the ID
              if (reaction.emoji.startsWith('<:') || reaction.emoji.startsWith('<a:')) {
                const match = reaction.emoji.match(/<(?:a)?:(\w+):(\d+)>/);
                if (match) {
                  const emojiId = match[2];
                  await finalMessage.react(emojiId);
                }
              } else {
                await finalMessage.react(reaction.emoji);
              }
            } catch (err) {
              logger.error(`Failed to add reaction ${reaction.emoji}: ${err}`);
            }
          }
          
          // Save the reaction role configuration to the database
          const reactionRole = new ReactionRole({
            messageID: finalMessage.id,
            channelID: message.channelId,
            guildID: message.guildId,
            reactions: setup.reactions,
            type: setup.type
          });
          
          await reactionRole.save();
          
          // Remove the setup data
          client.reactionRoleSetups.delete(message.id);
          
          // End the collector
          collector.stop();
          
          // Delete the setup message
          try {
            await setupMessage.delete();
          } catch (err) {
            logger.warn(`Could not delete setup message: ${err}`);
          }
          
          await i.reply({
            content: 'Reaction role message published successfully!',
            ephemeral: true
          });
          
        } else if (i.customId === `rr-cancel-${message.id}`) {
          // Remove the setup data
          client.reactionRoleSetups.delete(message.id);
          
          // End the collector
          collector.stop();
          
          // Delete the setup message
          try {
            await setupMessage.delete();
          } catch (err) {
            logger.warn(`Could not delete setup message: ${err}`);
          }
          
          await i.reply({
            content: 'Reaction role setup cancelled.',
            ephemeral: true
          });
        }
      });
      
      collector.on('end', async (collected, reason) => {
        if (reason === 'time') {
          // Remove the setup data
          client.reactionRoleSetups.delete(message.id);
          
          // Try to delete the setup message
          try {
            await setupMessage.delete();
          } catch (err) {
            // If the message has already been deleted, just ignore
            if (err.code !== 10008) {
              logger.warn(`Could not delete setup message: ${err}`);
            }
          }
        }
      });
      
    } catch (error) {
      logger.error(`Error executing reactionrole command: ${error}`);
      message.reply('There was an error setting up the reaction role!');
    }
  }
};