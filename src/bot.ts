import { Client, Message, DiscordAPIError, Interaction, TextChannel, Guild } from 'discord.js';
import { DemoLoadBalancing, PhotonRunner, MAX_PLAYERS } from './app';
import path from 'path';

const CHANNEL_ID = "1311233429572161556";
const GUILD_ID = "1224423183155728414"

var KNIGHTFALL_GUILD: Guild | undefined;

var TAG = "";

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
    intents: ['GuildMessages', 'MessageContent', 'Guilds', 'GuildMembers'],
});

client.once('ready', async () => {
    console.log(`Logged in as ${client.user?.tag}!`);

    // Troll ThirdOne
    // const channel = await client.channels.fetch(CHANNEL_ID);
    // (channel as TextChannel).send('Is there a way to mute ThirdOne 🤓☝️');

    KNIGHTFALL_GUILD = client.guilds.cache.get(GUILD_ID);
    if (!KNIGHTFALL_GUILD) console.error(`Guild ${GUILD_ID} not found ! Can't use /tag command.`);

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
    else if (commandName === 'tag') {
        let message = await countClanTags();
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

async function respondSlash(interaction: any, response: string) {
    // We have 3 seconds to respond
    // If we take too long, catch the 'Unknown interaction' error.
    try {
        await interaction.reply(response);
    }
    catch (e) {
        if (e instanceof DiscordAPIError) {
            console.warn("Took too long to respond (> 3 seconds). Can't respond anymore to the slash command");
        }
        else {
            console.error("Couldn't reply to interaction. Unknown error:" + e);
        }
    }
}

function handleQueue() {
    var playersInQueue = DemoLoadBalancing.countOfPlayersInCurrentQueue;
    if (playersInQueue == -1) {
        return "_Couldn't fetch queue information. Please retry later._";
    }

    var remainingQueueTime = Math.ceil(DemoLoadBalancing.getRemainingQueueTime());
    var waitingFor = `**${playersInQueue}/${MAX_PLAYERS}** players.`;
    var message = "_Something went wrong..._";

    if (playersInQueue == 0 || remainingQueueTime <= -15) {
        var message = "No active queue.";
    }
    else if (remainingQueueTime > 0) {
        message = `${waitingFor} Starting in **${remainingQueueTime} seconds**...`;
    }
    else if (remainingQueueTime <= 0 && remainingQueueTime >= - 15) {
        message = `${waitingFor} Starting now...`;
    }

    return message;
}

function handlePlayers() {
    var activePlayers = DemoLoadBalancing.playersInGameOrQueue;
    var message = `Active players: **${activePlayers}**`;

    return message;
}

async function handleEUMigratedPlayers() {
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

async function countClanTags() {
    // Make sure the guild is fetched
    if (!KNIGHTFALL_GUILD) {
        console.error("Guild not found");
        return "Something went wrong... Please try again later."
    }

    // Can't use discord.js to fetch members with cache improvements
    // because members objects do not contain the clan tag information.
    // await KNIGHTFALL_GUILD.members.fetch();
    // const memberList = Array.from(KNIGHTFALL_GUILD.members.cache.values());

    const res = await fetchGuildMembers();

    if (!res.ok) {
        console.error(`Error fetching user data for guild ${GUILD_ID}. Status: ${res.status}`);
        return "Something went wrong... Please try again later.";
    }

    TAG = "";

    const data = await res.json();
    const taggedMembers = data.filter((member: { user: { username: any; }; }) => {
        const tagged = hasTag(member);
        if (tagged) console.log(`[+] Found tag user: ${member.user.username}`);
        return tagged;
    });

    const totalMembers = data.length;
    const totalTagged = taggedMembers.length;

    return `**${totalTagged}/${totalMembers}** KNFBW tag users.`;
}

async function fetchGuildMembers() {
    const res = await fetch(`https://discord.com/api/guilds/${GUILD_ID}/members?limit=1000`, {
        method: "GET",
        headers: {
            "Authorization": `Bot ${process.env.BOT_TOKEN}`,
            "Content-Type": "application/json"
        }
    });

    return res;
}

function hasTag(member: any) {
    // Not sure about the difference betweeen "primary_guild" and "clan".
    // Both seem to have the same data. Let's check both to be sure.
    let primaryGuild = member?.user?.primary_guild;
    let clan = member?.user?.clan;

    // Init tag if not set. This ensures the tag is periodically updated.
    if (TAG === "") TAG = primaryGuild?.tag || clan?.tag || TAG;

    return (
        (primaryGuild?.identity_guild_id === GUILD_ID && primaryGuild?.identity_enabled === true) ||
        (clan?.identity_guild_id === GUILD_ID && clan?.identity_enabled === true)
    );
}

// Login to Discord
client.login(BOT_TOKEN);

// Invite:
// https://discord.com/oauth2/authorize?client_id=1312025256936083507&permissions=2147483648&integration_type=0&scope=bot

// Deployment:
// https://railway.app/project/92b2c5d9-d055-4a9a-8bc7-509e41808700
// https://dashboard.render.com/web/srv-d0kroebe5dus73c1q6cg/deploys/dep-d0kroeje5dus73c1q6o0

// git push evennode evennode:main
// https://admin.evennode.com/a/d/knightbot/info