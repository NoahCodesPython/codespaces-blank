const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { stripIndent } = require('common-tags');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check the bot\'s latency'),
  
  category: 'information',
  usage: '/ping',
  examples: ['/ping'],
  aliases: ['latency'],
  
  /**
   * Execute the command - Slash Command
   * @param {*} interaction - The interaction object
   */
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setDescription('Pinging...')
      .setColor(interaction.guild.members.me.displayHexColor)
      .setFooter({ text: `Shard #${interaction.guild.shardId || 0}` });
    
    await interaction.reply({ embeds: [embed] });
    
    const latency = Date.now() - interaction.createdTimestamp;
    const apiLatency = Math.round(interaction.client.ws.ping);
    
    let pingInfo = stripIndent`
      **Time Taken:** \`${latency}ms\`
      **Discord API:** \`${apiLatency}ms\`
    `;
    
    let color = interaction.guild.members.me.displayHexColor;
    if (latency < 100) {
      color = '#00ff00'; // Green for good ping
    } else if (latency > 100 && latency < 200) {
      color = '#CCCC00'; // Yellow for medium ping
    } else if (latency > 200) {
      color = '#ff0000'; // Red for bad ping
    }
    
    embed.setDescription(pingInfo)
      .setColor(color);
      
    await interaction.editReply({ embeds: [embed] });
  },
  
  /**
   * Execute the command - Legacy Command
   * @param {*} message - The message object
   * @param {string[]} args - The message arguments
   * @param {*} client - The client object
   */
  async run(message, args, client) {
    const embed = new EmbedBuilder()
      .setDescription('Pinging...')
      .setColor(message.guild.members.me.displayHexColor)
      .setFooter({ text: `Shard #${message.guild.shardId || 0}` });
    
    const msg = await message.channel.send({ embeds: [embed] });
    
    const latency = msg.createdTimestamp - message.createdTimestamp;
    const apiLatency = Math.round(client.ws.ping);
    
    let pingInfo = stripIndent`
      **Time Taken:** \`${latency}ms\`
      **Discord API:** \`${apiLatency}ms\`
    `;
    
    let color = message.guild.members.me.displayHexColor;
    if (latency < 100) {
      color = '#00ff00'; // Green for good ping
    } else if (latency > 100 && latency < 200) {
      color = '#CCCC00'; // Yellow for medium ping
    } else if (latency > 200) {
      color = '#ff0000'; // Red for bad ping
    }
    
    embed.setDescription(pingInfo)
      .setColor(color);
      
    await msg.edit({ embeds: [embed] });
  }
};