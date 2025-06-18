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
const BOT_CLIENT_ID = process.env.NODE_ENV === 'production' ? process.env.BOT_CLIENT_ID || '' : process.env.DEV_BOT_CLIENT_ID || '';
console.log(`[${process.env.NODE_ENV === 'production' ? 'PROD' : 'DEV'}] Updating commands for bot with client ID: ${BOT_CLIENT_ID}.`);
// Define the slash command
const commands = [
    new discord_js_1.SlashCommandBuilder()
        .setName('queue')
        .setDescription('Current queue (NA) and number of active players (NA). AFK players are not included.'),
    new discord_js_1.SlashCommandBuilder()
        .setName('eu')
        .setDescription('Display the (approximate) number of players who migrated from EU to NA after seeing KnightBot.'),
    new discord_js_1.SlashCommandBuilder()
        .setName('tag')
        .setDescription('Display the number of users using Knightfall Biweekly clan tag.'),
].map(command => command.toJSON());
// Register the slash commands
const rest = new discord_js_1.REST({ version: '10' }).setToken(BOT_TOKEN);
(() => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('Started refreshing application (/) commands.');
        yield rest.put(discord_js_1.Routes.applicationCommands(BOT_CLIENT_ID), { body: commands });
        console.log('Successfully reloaded application (/) commands.');
    }
    catch (error) {
        console.error(error);
    }
}))();
