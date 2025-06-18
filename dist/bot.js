"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const app_1 = require("./app");
const CHANNEL_ID = "1311233429572161556";
const GUILD_ID = "1224423183155728414";
var KNIGHTFALL_GUILD;
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
const client = new discord_js_1.Client({
    intents: ['GuildMessages', 'MessageContent', 'Guilds', 'GuildMembers'],
});
client.once('ready', () => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    console.log(`Logged in as ${(_a = client.user) === null || _a === void 0 ? void 0 : _a.tag}!`);
    // Troll ThirdOne
    // const channel = await client.channels.fetch(CHANNEL_ID);
    // (channel as TextChannel).send('Is there a way to mute ThirdOne 🤓☝️');
    KNIGHTFALL_GUILD = client.guilds.cache.get(GUILD_ID);
    if (!KNIGHTFALL_GUILD)
        console.error(`Guild ${GUILD_ID} not found ! Can't use /tag command.`);
    app_1.PhotonRunner.run();
}));
// Slash commands
client.on('interactionCreate', (interaction) => __awaiter(void 0, void 0, void 0, function* () {
    if (!interaction.isCommand())
        return;
    const { commandName } = interaction;
    if (commandName === 'queue') {
        let response1 = handlePlayers();
        let response2 = handleQueue();
        let message = response1 + "\n" + response2;
        yield respondSlash(interaction, message);
    }
    else if (commandName === 'eu') {
        let message = yield handleEUMigratedPlayers();
        yield respondSlash(interaction, message);
    }
    else if (commandName === 'tag') {
        let message = yield countClanTags();
        yield respondSlash(interaction, message);
    }
}));
// Message commands (prefix: !)
client.on('messageCreate', (message) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    // Ignore messages from bots or without the prefix
    if (message.author.bot || !message.content.startsWith(cmdPrefix))
        return;
    // Remove the prefix and split the command from the arguments
    const args = message.content.slice(cmdPrefix.length).trim().split(/ +/);
    const command = (_a = args.shift()) === null || _a === void 0 ? void 0 : _a.toLowerCase();
    // Handle commands
    if (command === 'queue') {
        let response1 = handlePlayers();
        let response2 = handleQueue();
        yield message.reply(response1 + "\n" + response2);
    }
    else if (command === 'eu') {
        let response = yield handleEUMigratedPlayers();
        yield message.reply(response);
    }
}));
function respondSlash(interaction, response) {
    return __awaiter(this, void 0, void 0, function* () {
        // We have 3 seconds to respond
        // If we take too long, catch the 'Unknown interaction' error.
        try {
            yield interaction.reply(response);
        }
        catch (e) {
            if (e instanceof discord_js_1.DiscordAPIError) {
                console.warn("Took too long to respond (> 3 seconds). Can't respond anymore to the slash command");
            }
            else {
                console.error("Couldn't reply to interaction. Unknown error:" + e);
            }
        }
    });
}
function handleQueue() {
    var playersInQueue = app_1.DemoLoadBalancing.countOfPlayersInCurrentQueue;
    if (playersInQueue == -1) {
        return "_Couldn't fetch queue information. Please retry later._";
    }
    var remainingQueueTime = Math.ceil(app_1.DemoLoadBalancing.getRemainingQueueTime());
    var waitingFor = `**${playersInQueue}/${app_1.MAX_PLAYERS}** players.`;
    var message = "_Something went wrong..._";
    if (playersInQueue == 0 || remainingQueueTime <= -15) {
        var message = "No active queue.";
    }
    else if (remainingQueueTime > 0) {
        message = `${waitingFor} Starting in **${remainingQueueTime} seconds**...`;
    }
    else if (remainingQueueTime <= 0 && remainingQueueTime >= -15) {
        message = `${waitingFor} Starting now...`;
    }
    return message;
}
function handlePlayers() {
    var activePlayers = app_1.DemoLoadBalancing.playersInGameOrQueue;
    var message = `Active players: **${activePlayers}**`;
    return message;
}
function handleEUMigratedPlayers() {
    return __awaiter(this, void 0, void 0, function* () {
        const URL = "http://129.80.252.248:5000/migration";
        const response = yield fetch(URL);
        var message = "";
        if (!response.ok) {
            message = "_Something went wrong..._";
            console.error(`Error fetching ${URL}. Status: ` + response.status);
            return message;
        }
        const data = yield response.json();
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
    });
}
function countClanTags() {
    return __awaiter(this, void 0, void 0, function* () {
        // Make sure the guild is fetched
        if (!KNIGHTFALL_GUILD) {
            console.error("Guild not found");
            return "Something went wrong... Please try again later.";
        }
        // Can't use discord.js to fetch members with cache improvements
        // because members objects do not contain the clan tag information.
        // await KNIGHTFALL_GUILD.members.fetch();
        // const memberList = Array.from(KNIGHTFALL_GUILD.members.cache.values());
        const res = yield fetchGuildMembers();
        if (!res.ok) {
            console.error(`Error fetching user data for guild ${GUILD_ID}. Status: ${res.status}`);
            return "Something went wrong... Please try again later.";
        }
        TAG = "";
        const data = yield res.json();
        const taggedMembers = data.filter((member) => {
            const tagged = hasTag(member);
            if (tagged)
                console.log(`[+] Found tag user: ${member.user.username}`);
            return tagged;
        });
        const totalMembers = data.length;
        const totalTagged = taggedMembers.length;
        return `**${totalTagged}/${totalMembers}** ${TAG} tag users.`;
    });
}
function fetchGuildMembers() {
    return __awaiter(this, void 0, void 0, function* () {
        const res = yield fetch(`https://discord.com/api/guilds/${GUILD_ID}/members?limit=1000`, {
            method: "GET",
            headers: {
                "Authorization": `Bot ${process.env.BOT_TOKEN}`,
                "Content-Type": "application/json"
            }
        });
        return res;
    });
}
function hasTag(member) {
    var _a, _b;
    // Not sure about the difference betweeen "primary_guild" and "clan".
    // Both seem to have the same data. Let's check both to be sure.
    let primaryGuild = (_a = member === null || member === void 0 ? void 0 : member.user) === null || _a === void 0 ? void 0 : _a.primary_guild;
    let clan = (_b = member === null || member === void 0 ? void 0 : member.user) === null || _b === void 0 ? void 0 : _b.clan;
    // Init tag if not set. This ensures the tag is periodically updated.
    if (TAG === "")
        TAG = (primaryGuild === null || primaryGuild === void 0 ? void 0 : primaryGuild.tag) || (clan === null || clan === void 0 ? void 0 : clan.tag) || TAG;
    return (((primaryGuild === null || primaryGuild === void 0 ? void 0 : primaryGuild.identity_guild_id) === GUILD_ID && (primaryGuild === null || primaryGuild === void 0 ? void 0 : primaryGuild.identity_enabled) === true) ||
        ((clan === null || clan === void 0 ? void 0 : clan.identity_guild_id) === GUILD_ID && (clan === null || clan === void 0 ? void 0 : clan.identity_enabled) === true));
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
