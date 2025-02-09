import { REST, Routes, SlashCommandBuilder } from 'discord.js';

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();

    if (!process.env.DEV_BOT_TOKEN || !process.env.DEV_BOT_CLIENT_ID) {
        console.error('(DEV) Invalid bot token or client ID from ENV. Exiting...');
        process.exit(1);
    }
  }

if (!process.env.BOT_TOKEN || !process.env.BOT_CLIENT_ID) {
    console.error('Invalid bot token or client ID from ENV. Exiting...');
    process.exit(1);
}

const BOT_TOKEN = process.env.NODE_ENV === 'production' ? process.env.BOT_TOKEN || '' : process.env.DEV_BOT_TOKEN || '';
const BOT_CLIENT_ID =  process.env.NODE_ENV === 'production' ? process.env.BOT_CLIENT_ID || '' : process.env.DEV_BOT_CLIENT_ID || '';

console.log('NODE_ENV', process.env.NODE_ENV, 'Updating for bot with client ID:', BOT_CLIENT_ID, 'and token:', BOT_TOKEN);

// Define the slash command
const commands = [
    new SlashCommandBuilder()
        .setName('players')
        .setDescription('Display the number of active players (NA). AFK players are not included.'),
    new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Display the number of players in the current queue (NA) and its starting countdown.'),
    new SlashCommandBuilder()
        .setName('eu')
        .setDescription('Display the (approximate) number of players who migrated from EU to NA after seeing KnightBot.'),
].map(command => command.toJSON());

// Register the slash commands
const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(BOT_CLIENT_ID),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();