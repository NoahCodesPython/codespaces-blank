# Multipurpose Discord Bot

Welcome to the **Multipurpose Discord Bot**! This bot is your all-in-one solution for managing and enhancing your Discord server. Packed with powerful features, it is designed to cater to a wide range of server needs, from moderation to entertainment.

---

## 🌟 Features

- **Moderation Tools**: Effortlessly manage your server with commands for banning, kicking, muting, and more.
- **Fun Commands**: Keep your community engaged with games, memes, and interactive features.
- **Utility Functions**: Access tools like reminders, polls, server stats, and more.
- **Custom Commands**: Create and manage custom commands tailored to your server.
- **Reaction Roles**: Allow users to assign roles by reacting to messages.
- **Welcome System**: Greet new members with customizable welcome messages and GIFs.
- **Ticket System**: Streamline support with an easy-to-use ticketing system.
- **Economy System**: Introduce a virtual economy with customizable currency and rewards.
- **Application System**: Manage applications for roles or events directly within Discord.

---

## 📜 Command Categories

### Moderation
- `!ban` - Ban a user from the server.
- `!kick` - Kick a user from the server.
- `!mute` - Temporarily mute a user.
- `!warn` - Issue a warning to a user.

### Fun
- `!meme` - Fetch a random meme.
- `!8ball` - Ask the magic 8-ball a question.
- `!joke` - Get a random joke.

### Utility
- `!remindme` - Set a personal reminder.
- `!poll` - Create a poll for server members.
- `!serverinfo` - Display server statistics.

### Reaction Roles
- `!addreactionrole` - Add a reaction role to a message.
- `!removereactionrole` - Remove a reaction role.

### Tickets
- `!createticket` - Open a new support ticket.
- `!closeticket` - Close an existing ticket.

### Economy
- `!balance` - Check your virtual currency balance.
- `!daily` - Claim your daily reward.
- `!shop` - View the server shop.

---

## 🚀 Getting Started

1. Clone the repository:
    ```bash
    git clone <repository-url>
    ```
2. Install dependencies:
    ```bash
    npm install
    ```
3. Set up your `.env` file with the required bot token and configurations.
4. Start the bot:
    ```bash
    npm start
    ```

---

## 🛠️ Code Overview

The bot is built with modularity in mind, featuring a well-structured codebase:

- **Commands**: Located in `src/commands/`, organized by category.
- **Events**: Event handlers are in `src/events/`.
- **Models**: Database models are in `src/models/`.
- **Utilities**: Helper functions are in `src/utils/`.

### Example: Generating Welcome GIFs
The bot includes a feature to generate welcome GIFs for new members. Below is a snippet of the implementation:

```javascript
const { generateWelcomeGif } = require('./utils/generateWelcomeGif');

// Example usage
bot.on('guildMemberAdd', async (member) => {
  const welcomeGif = await generateWelcomeGif(member.user, member.guild, 'Welcome {user} to {server}!', 'background-url');
  const channel = member.guild.channels.cache.find(ch => ch.name === 'welcome');
  if (channel) channel.send({ files: [welcomeGif] });
});
```

---

## 🤝 Contributing

We welcome contributions! Feel free to submit issues or pull requests to help improve the bot. Check out our `CONTRIBUTING.md` for guidelines.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

Stay tuned for updates and new features!