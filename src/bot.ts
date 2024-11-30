import { Client, GatewayIntentBits, Interaction } from 'discord.js';
import { DemoLoadBalancing, PhotonRunner, MAX_PLAYERS } from './app';

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
    console.log("Bot token:" + process.env.BOT_TOKEN);
    console.log("Bot client ID:" + process.env.BOT_CLIENT_ID);
  }

if (!process.env.BOT_TOKEN || !process.env.BOT_CLIENT_ID) {
    console.error('Invalid bot token or client ID from ENV. Exiting...');
    process.exit(1);
}

// Initialize Discord client
const client = new Client({
    intents: [],
});

// Event listener: When the bot is ready
client.once('ready', () => {
    console.log(`Logged in as ${client.user?.tag}!`);
    PhotonRunner.run();
});

// Event listener: Interaction handler
client.on('interactionCreate', async (interaction: Interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'players') {
        var totalPlayers = DemoLoadBalancing.totalPlayers;
        await interaction.reply(`Active players: **${totalPlayers}**`);
    }
    else if (commandName === 'queue') {
        var playersInQueue = DemoLoadBalancing.countOfPlayersInCurrentQueue;
        if (playersInQueue == -1)
        {
            await interaction.reply("Couldn't fetch queue information. Please retry later.");
            return;
        }

        var remainingQueueTime = Math.ceil(DemoLoadBalancing.getRemainingQueueTime());
        var waitingFor = `**${playersInQueue}/${MAX_PLAYERS}** players.`;
        var message = "Something went wrong...";
        if (remainingQueueTime > 0)
        {
            message = `${waitingFor} Starting in **${remainingQueueTime} seconds**...`;
        }
        if (remainingQueueTime <= 0 && remainingQueueTime >= - 15)
        {
            message = `${waitingFor} Starting now...`;
        }
        else if (remainingQueueTime <= -15)
        {
            var message = "No active queue.";
        }
        
        await interaction.reply(message);
    }
});

// Login to Discord
client.login(process.env.BOT_TOKEN);

// Invite:
// https://discord.com/oauth2/authorize?client_id=1312025256936083507&permissions=2147483648&integration_type=0&scope=bot