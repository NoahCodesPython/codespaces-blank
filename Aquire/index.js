
const AquireClient = require("./Aquire");
const config = require("./config.json");
const domain = require("./config.js");

const Aquire = new AquireClient(config);

const color = require("./data/colors");
Aquire.color = color;

Aquire.domain = domain.domain || `https://aquire.tk`;

const emoji = require("./data/emoji");
Aquire.emoji = emoji;

let client = Aquire
const jointocreate = require("./structures/jointocreate");
jointocreate(client);

Aquire.react = new Map()
Aquire.fetchforguild = new Map()

if(config.dashboard === "true"){
    const Dashboard = require("./dashboard/dashboard");
    Dashboard(client); 
}

const fetch = require("node-fetch");

client.on("message", async message => {
    if (message.channel.name === "chatbot") {
        if (message.author.bot) return;

        message.content = message.content.replace(/@(everyone)/gi, "everyone").replace(/@(here)/gi, "here");

        if (message.content.includes(`@`)) {
            return message.channel.send(`**:x: Please don't mention anyone**`);
        }

        message.channel.startTyping();

        if (!message.content) {
            message.channel.stopTyping();
            return message.channel.send("Please say something.");
        }

      try {
        const url = 'https://api.affiliateplus.xyz/api/chatbot';
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                message: message.content,
                botname: client.user.username,
                owner: "User",
                user: message.author.username
            })
        });

        console.log('Response status:', response.status);

        // Check for successful response status
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data && data.message) {
            message.channel.send(`> ${message.content}\n${data.message}`);
        } else {
            message.channel.send(`:x: I couldn't process that message.`);
        }
      } catch (error) {
        console.error('Fetch error:', error);
        message.channel.send(`:x: An error occurred while trying to fetch data from the chatbot.`);
      } finally {
        // Ensure the typing state is stopped to prevent user confusion
        message.channel.stopTyping();
      }




    }
});


        
process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

Aquire.start().catch(err => {
  console.error('Failed to start bot:', err);
  process.exit(1);
});
client.on('message', async (message) => {
  if (message.content === 'shutdown') {
    await client.destroy();
    process.exit(0); // Exit process after shutting down client
  }
});