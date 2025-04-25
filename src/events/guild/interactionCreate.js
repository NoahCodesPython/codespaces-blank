const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const logger = require('../../utils/logger');
const AppID = require('../../models/application/AppID');
const Applied = require('../../models/application/Applied');
const Application = require('../../models/application/Application');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    try {
      // Debug logging
      logger.debug(`Received interaction: ${interaction.id}, type: ${interaction.type}, commandName: ${interaction.commandName || 'N/A'}`);
      
      // Handle slash commands
      if (interaction.isCommand()) {
        logger.debug(`Processing slash command: ${interaction.commandName}`);
        
        // Get the command from the client.slashCommands collection
        const command = client.slashCommands.get(interaction.commandName);
        
        // If the command doesn't exist, log and return
        if (!command) {
          logger.warn(`Command not found in collection: ${interaction.commandName}`);
          return;
        }
        
        logger.debug(`Found command in collection: ${command.name}`);
        
        try {
          // Log command execution attempt
          logger.debug(`Attempting to execute command: ${command.name}`);
          
          // Execute the command
          await command.execute(interaction, client);
          
          // Log successful execution
          logger.debug(`Successfully executed command: ${command.name}`);
        } catch (error) {
          logger.error(`Error executing command ${interaction.commandName}: ${error}`);
          logger.error(error.stack);
          
          // Check if the interaction has already been replied to or deferred
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ 
              content: 'There was an error while executing this command!', 
              ephemeral: true 
            });
          } else {
            await interaction.reply({ 
              content: 'There was an error while executing this command!', 
              ephemeral: true 
            });
          }
        }
      }
      
      // Handle modals (for application submissions)
      else if (interaction.isModalSubmit()) {
        logger.debug(`Processing modal submission: ${interaction.customId}`);
        if (interaction.customId.startsWith('application_')) {
          await handleApplicationSubmit(interaction, client);
        }
      }
      
      // Handle button interactions
      else if (interaction.isButton()) {
        logger.debug(`Processing button interaction: ${interaction.customId}`);
        if (interaction.customId.startsWith('app_approve_')) {
          await handleApproveButton(interaction, client);
        }
        else if (interaction.customId.startsWith('app_decline_')) {
          await handleDeclineButton(interaction, client);
        }
        else if (interaction.customId.startsWith('rr-')) {
          // Let this be handled by the reaction role command directly
          logger.debug(`Skipping reaction role button handling for: ${interaction.customId}`);
          return;
        }
      }
      
    } catch (error) {
      logger.error(`Error in interactionCreate event: ${error}`);
    }
  }
};

// Function to handle application submissions
async function handleApplicationSubmit(interaction, client) {
  try {
    // Extract the application ID from the custom ID
    const applicationId = interaction.customId.replace('application_', '');
    
    // Find the application in the database
    const appInfo = await AppID.findOne({
      guildID: interaction.guild.id,
      userID: interaction.user.id,
      appID: applicationId
    });
    
    if (!appInfo) {
      return interaction.reply({ 
        content: 'There was an error with your application. Please try again.',
        ephemeral: true
      });
    }
    
    // Get application settings
    const applicationSettings = await Application.findOne({ 
      guildID: interaction.guild.id 
    });
    
    if (!applicationSettings) {
      return interaction.reply({ 
        content: 'The application system is not properly configured. Please contact a server administrator.',
        ephemeral: true
      });
    }
    
    // Parse answers from the modal
    const answers = [];
    applicationSettings.questions.forEach((question, index) => {
      if (index < 5) { // Maximum of 5 questions in a modal
        const fieldName = `question_${index}`;
        const answer = interaction.fields.getTextInputValue(fieldName);
        answers.push(answer);
      }
    });
    
    // Create a record that user has applied
    await Applied.create({
      guildID: interaction.guild.id,
      userID: interaction.user.id,
      appID: [applicationId],
      hasApplied: true
    });
    
    // Create application embed for logs
    const logEmbed = new EmbedBuilder()
      .setTitle(`New Application from ${interaction.user.tag}`)
      .setDescription(`Application ID: \`${applicationId}\`\nUser: <@${interaction.user.id}> (${interaction.user.id})`)
      .setColor('#3498db')
      .setTimestamp()
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));
    
    // Add questions and answers
    for (let i = 0; i < answers.length; i++) {
      logEmbed.addFields({ 
        name: `Question ${i + 1}: ${applicationSettings.questions[i]}`, 
        value: answers[i] || 'No answer provided' 
      });
    }
    
    // Create buttons for approve/decline
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`app_approve_${applicationId}`)
          .setLabel('Approve')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`app_decline_${applicationId}`)
          .setLabel('Decline')
          .setStyle(ButtonStyle.Danger)
      );
    
    // Send to logs channel
    if (applicationSettings.appLogs) {
      const logsChannel = interaction.guild.channels.cache.get(applicationSettings.appLogs);
      
      if (logsChannel) {
        await logsChannel.send({ embeds: [logEmbed], components: [row] });
      }
    }
    
    // Reply to the interaction
    await interaction.reply({ 
      content: 'Thank you for submitting your application! Staff will review it shortly.',
      ephemeral: true
    });
    
  } catch (error) {
    logger.error(`Error handling application submission: ${error}`);
    
    // Try to respond to the interaction if it hasn't been replied to yet
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ 
        content: 'There was an error processing your application. Please try again later.',
        ephemeral: true
      });
    }
  }
}

// Function to handle approve button clicks
async function handleApproveButton(interaction, client) {
  try {
    // Get the application ID from the button custom ID
    const applicationId = interaction.customId.replace('app_approve_', '');
    
    // Defer the reply to give us time to process
    await interaction.deferReply({ ephemeral: true });
    
    // Get application config
    const applicationSettings = await Application.findOne({ guildID: interaction.guild.id });
    
    // Check if application system is enabled
    if (!applicationSettings || !applicationSettings.appToggle) {
      return interaction.editReply('The application system is not enabled on this server.');
    }
    
    // Find the application
    const appInfo = await AppID.findOne({
      guildID: interaction.guild.id,
      appID: applicationId
    });
    
    if (!appInfo) {
      return interaction.editReply('Invalid application ID. Please check and try again.');
    }
    
    // Check if user has already applied
    const appliedInfo = await Applied.findOne({
      guildID: interaction.guild.id,
      userID: appInfo.userID,
      hasApplied: true
    });
    
    if (!appliedInfo) {
      return interaction.editReply('This application has already been processed.');
    }
    
    // Get the user
    const user = await client.users.fetch(appInfo.userID).catch(() => null);
    const member = user ? await interaction.guild.members.fetch(user.id).catch(() => null) : null;
    
    if (!member) {
      return interaction.editReply('The user who submitted this application is no longer in the server.');
    }
    
    // Mark application as not active
    appliedInfo.hasApplied = false;
    await appliedInfo.save();
    
    // Add role if configured
    if (applicationSettings.add_role) {
      const role = interaction.guild.roles.cache.get(applicationSettings.add_role);
      
      if (role && !member.roles.cache.has(role.id)) {
        await member.roles.add(role).catch(error => {
          logger.error(`Error adding role in approve button: ${error}`);
          return interaction.editReply('Could not add the configured role. Please check my permissions.');
        });
      }
    }
    
    // Remove role if configured
    if (applicationSettings.remove_role) {
      const removeRole = interaction.guild.roles.cache.get(applicationSettings.remove_role);
      
      if (removeRole && member.roles.cache.has(removeRole.id)) {
        await member.roles.remove(removeRole).catch(error => {
          logger.error(`Error removing role in approve button: ${error}`);
        });
      }
    }
    
    // Notify user if DM is enabled
    if (applicationSettings.dm) {
      try {
        const dmEmbed = new EmbedBuilder()
          .setTitle(`Application Approved - ${interaction.guild.name}`)
          .setDescription(`Your application has been approved!`)
          .setColor('#00FF00')
          .setTimestamp();
        
        await user.send({ embeds: [dmEmbed] }).catch(() => {
          // DM failed - just log and continue
          logger.warn(`Could not send DM to user ${user.tag} (${user.id})`);
        });
      } catch (error) {
        logger.error(`Error sending DM in approve button: ${error}`);
      }
    }
    
    // Log to the application log channel
    if (applicationSettings.appLogs) {
      const logChannel = interaction.guild.channels.cache.get(applicationSettings.appLogs);
      
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setTitle('Application Approved')
          .setDescription(`Application ID: \`${applicationId}\``)
          .addFields(
            { name: 'User', value: `<@${user.id}> (${user.tag})` },
            { name: 'Approved By', value: `<@${interaction.user.id}> (${interaction.user.tag})` }
          )
          .setColor('#00FF00')
          .setTimestamp();
        
        await logChannel.send({ embeds: [logEmbed] }).catch(error => {
          logger.error(`Error sending log in approve button: ${error}`);
        });
      }
    }
    
    // Edit the original message to disable buttons
    if (interaction.message) {
      try {
        const disabledRow = ActionRowBuilder.from(interaction.message.components[0]);
        for (const component of disabledRow.components) {
          component.setDisabled(true);
        }
        
        const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0]);
        updatedEmbed.setColor('#00FF00');
        updatedEmbed.addFields({ 
          name: 'Status', 
          value: `✅ Approved by <@${interaction.user.id}> on ${new Date().toLocaleString()}` 
        });
        
        await interaction.message.edit({ 
          embeds: [updatedEmbed], 
          components: [disabledRow]
        });
      } catch (error) {
        logger.error(`Error updating message in approve button: ${error}`);
      }
    }
    
    // Reply to the interaction
    await interaction.editReply('Successfully approved the application!');
    
  } catch (error) {
    logger.error(`Error handling approve button: ${error}`);
    
    if (interaction.deferred) {
      await interaction.editReply('There was an error processing this action. Please try again later.');
    } else {
      await interaction.reply({ 
        content: 'There was an error processing this action. Please try again later.',
        ephemeral: true
      });
    }
  }
}

// Function to handle decline button clicks
async function handleDeclineButton(interaction, client) {
  try {
    // Get the application ID from the button custom ID
    const applicationId = interaction.customId.replace('app_decline_', '');
    
    // Defer the reply to give us time to process
    await interaction.deferReply({ ephemeral: true });
    
    // Get application config
    const applicationSettings = await Application.findOne({ guildID: interaction.guild.id });
    
    // Check if application system is enabled
    if (!applicationSettings || !applicationSettings.appToggle) {
      return interaction.editReply('The application system is not enabled on this server.');
    }
    
    // Find the application
    const appInfo = await AppID.findOne({
      guildID: interaction.guild.id,
      appID: applicationId
    });
    
    if (!appInfo) {
      return interaction.editReply('Invalid application ID. Please check and try again.');
    }
    
    // Check if user has already applied
    const appliedInfo = await Applied.findOne({
      guildID: interaction.guild.id,
      userID: appInfo.userID,
      hasApplied: true
    });
    
    if (!appliedInfo) {
      return interaction.editReply('This application has already been processed.');
    }
    
    // Get the user
    const user = await client.users.fetch(appInfo.userID).catch(() => null);
    
    if (!user) {
      return interaction.editReply('The user who submitted this application could not be found.');
    }
    
    // Mark application as not active
    appliedInfo.hasApplied = false;
    await appliedInfo.save();
    
    // Notify user if DM is enabled
    if (applicationSettings.dm) {
      try {
        const dmEmbed = new EmbedBuilder()
          .setTitle(`Application Declined - ${interaction.guild.name}`)
          .setDescription(`Your application has been declined.`)
          .setColor('#FF0000')
          .setTimestamp();
        
        await user.send({ embeds: [dmEmbed] }).catch(() => {
          // DM failed - just log and continue
          logger.warn(`Could not send DM to user ${user.tag} (${user.id})`);
        });
      } catch (error) {
        logger.error(`Error sending DM in decline button: ${error}`);
      }
    }
    
    // Log to the application log channel
    if (applicationSettings.appLogs) {
      const logChannel = interaction.guild.channels.cache.get(applicationSettings.appLogs);
      
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setTitle('Application Declined')
          .setDescription(`Application ID: \`${applicationId}\``)
          .addFields(
            { name: 'User', value: `<@${user.id}> (${user.tag})` },
            { name: 'Declined By', value: `<@${interaction.user.id}> (${interaction.user.tag})` }
          )
          .setColor('#FF0000')
          .setTimestamp();
        
        await logChannel.send({ embeds: [logEmbed] }).catch(error => {
          logger.error(`Error sending log in decline button: ${error}`);
        });
      }
    }
    
    // Edit the original message to disable buttons
    if (interaction.message) {
      try {
        const disabledRow = ActionRowBuilder.from(interaction.message.components[0]);
        for (const component of disabledRow.components) {
          component.setDisabled(true);
        }
        
        const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0]);
        updatedEmbed.setColor('#FF0000');
        updatedEmbed.addFields({ 
          name: 'Status', 
          value: `❌ Declined by <@${interaction.user.id}> on ${new Date().toLocaleString()}` 
        });
        
        await interaction.message.edit({ 
          embeds: [updatedEmbed], 
          components: [disabledRow]
        });
      } catch (error) {
        logger.error(`Error updating message in decline button: ${error}`);
      }
    }
    
    // Reply to the interaction
    await interaction.editReply('Successfully declined the application!');
    
  } catch (error) {
    logger.error(`Error handling decline button: ${error}`);
    
    if (interaction.deferred) {
      await interaction.editReply('There was an error processing this action. Please try again later.');
    } else {
      await interaction.reply({ 
        content: 'There was an error processing this action. Please try again later.',
        ephemeral: true
      });
    }
  }
}