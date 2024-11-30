import { REST, Routes, SlashCommandBuilder } from 'discord.js';

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
  }

if (!process.env.BOT_TOKEN || !process.env.BOT_CLIENT_ID) {
    console.error('Invalid bot token or client ID from ENV. Exiting...');
    process.exit(1);
}

// Define the slash command
const commands = [
    new SlashCommandBuilder()
        .setName('players')
        .setDescription('Display the number of active players. AFK players are not included.'),
    new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Display the number of players in the current queue.'),
].map(command => command.toJSON());

// Register the slash commands
const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN || '');

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(process.env.BOT_CLIENT_ID || ''),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();