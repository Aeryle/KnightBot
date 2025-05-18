import { Client, Message, DiscordAPIError, Interaction  } from 'discord.js';
import { DemoLoadBalancing, PhotonRunner, MAX_PLAYERS } from './app';
import { Worker } from 'worker_threads';
import path from 'path';

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

const cmdPrefix = '!';
const client = new Client({
    intents: ['GuildMessages', 'MessageContent', 'Guilds'],
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user?.tag}!`);

    PhotonRunner.run();
});

// Slash commands
client.on('interactionCreate', async (interaction: Interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'queue') {
        let response1 = handlePlayers();
        let response2 = handleQueue();
        let message = response1 + "\n" + response2;
        await respondSlash(interaction, message);
    }
    else if (commandName === 'eu') {
        let message = await handleEUMigratedPlayers();
        await respondSlash(interaction, message);
    }
});

// Message commands (prefix: !)
client.on('messageCreate', async (message: Message) => {
    // Ignore messages from bots or without the prefix
    if (message.author.bot || !message.content.startsWith(cmdPrefix)) return;

    // Remove the prefix and split the command from the arguments
    const args = message.content.slice(cmdPrefix.length).trim().split(/ +/);
    const command = args.shift()?.toLowerCase();

    // Handle commands
    if (command === 'queue') {
        let response1 = handlePlayers();
        let response2 = handleQueue();
        await message.reply(response1 + "\n" + response2);
    }
    else if (command === 'eu') {
        let response = await handleEUMigratedPlayers();
        await message.reply(response);
    }
});

async function respondSlash(interaction: any, response: string)
{
    // We have 3 seconds to respond
    // If we take too long, catch the 'Unknown interaction' error.
    try
    {
        await interaction.reply(response);
    }
    catch(e)
    {
        if (e instanceof DiscordAPIError)
        {
            console.warn("Took too long to respond (> 3 seconds). Can't respond anymore to the slash command");
        }
        else
        {
            console.error("Couldn't reply to interaction. Unknown error:" + e);
        }
    }
}

function handleQueue()
{
    var playersInQueue = DemoLoadBalancing.countOfPlayersInCurrentQueue;
    if (playersInQueue == -1)
    {
        return "_Couldn't fetch queue information. Please retry later._";
    }

    var remainingQueueTime = Math.ceil(DemoLoadBalancing.getRemainingQueueTime());
    var waitingFor = `**${playersInQueue}/${MAX_PLAYERS}** players.`;
    var message = "_Something went wrong..._";

    if (playersInQueue == 0 || remainingQueueTime <= -15)
    {
        var message = "No active queue.";
    }
    else if (remainingQueueTime > 0)
    {
        message = `${waitingFor} Starting in **${remainingQueueTime} seconds**...`;
    }
    else if (remainingQueueTime <= 0 && remainingQueueTime >= - 15)
    {
        message = `${waitingFor} Starting now...`;
    }

    return message;
}

function handlePlayers()
{
    var activePlayers = DemoLoadBalancing.playersInGameOrQueue;
    var message = `Active players: **${activePlayers}**`;

    return message;
}

async function handleEUMigratedPlayers()
{
    const URL = "http://129.80.252.248:5000/migration";
    const response = await fetch(URL);

    var message = "";
    if (!response.ok) {
        message = "_Something went wrong..._";
        console.error(`Error fetching ${URL}. Status: ` + response.status);
        return message;
    }

    const data = await response.json();
    // Ensure data contains 'migrated' and 'total' keys
    if (!data.migrated || !data.total) {
        message = "_Something went wrong..._";
        console.error(`Invalid data received from ${URL}. Data: ` + JSON.stringify(data));
        return message;
    }

    // Percent (as integer)
    var percent = Math.round((data.migrated / data.total) * 100);
    message = `Migrated players: **${data.migrated}/${data.total}** (${percent} %)`;
    return message;
}

// Add necessary empty web service for 'Render' deployment
// Start the HTTP server in a separate worker thread
const worker = new Worker(path.resolve(__dirname, './web.js'));

worker.on('online', () => {
  console.log('Server is running in the background on port 8000');
});

worker.on('exit', (code) => {
  console.log(`Worker exited with code ${code}`);
});

// Login to Discord
client.login(BOT_TOKEN);

// Invite:
// https://discord.com/oauth2/authorize?client_id=1312025256936083507&permissions=2147483648&integration_type=0&scope=bot

// Deployment:
// https://railway.app/project/92b2c5d9-d055-4a9a-8bc7-509e41808700
// https://dashboard.render.com/web/srv-d0kroebe5dus73c1q6cg/deploys/dep-d0kroeje5dus73c1q6o0