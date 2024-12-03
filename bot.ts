import { Client, Message, DiscordAPIError, Interaction  } from 'discord.js';
import { DemoLoadBalancing, PhotonRunner, MAX_PLAYERS } from './app';

if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
  }

if (!process.env.BOT_TOKEN || !process.env.BOT_CLIENT_ID) {
    console.error('Invalid bot token or client ID from ENV. Exiting...');
    process.exit(1);
}

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

    if (commandName === 'players') {
        let message = await handlePlayers();
        await respondSlash(interaction, message);
    }
    else if (commandName === 'queue') {
        let message = await handleQueue();
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
    if (command === 'players') {
        let response = handlePlayers();
        await message.reply(response);
    } else if (command === 'queue') {
        let response = handleQueue();
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
            console.error("Couldn't reply to interaction. Unknown error: + e");
        }
    }
}

function handleQueue()
{
    var playersInQueue = DemoLoadBalancing.countOfPlayersInCurrentQueue;
    if (playersInQueue == -1)
    {
        return "Couldn't fetch queue information. Please retry later.";
    }
    else if (playersInQueue == 0)
    {
        return "No active queue.";
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

    return message;
}

function handlePlayers()
{
    var totalPlayers = DemoLoadBalancing.totalPlayers;
    var message = `Active players: **${totalPlayers}**`;
    return message;
}

// Login to Discord
client.login(process.env.BOT_TOKEN);