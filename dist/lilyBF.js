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
exports.RPCFactory = exports.LilyBFHandler = exports.LilyBannedForever = void 0;
// @ts-nocheck
/// <reference path="Photon/photon.d.ts"/>
// import WebSocket from 'ws'; // DO NOT WORK
var WebSocket = require('ws'); // FROM NATIVE NODE.JS
const cloud_app_info_1 = require("./cloud-app-info");
const photon_1 = require("./photon");
const rpcList_1 = require("./rpcList");
const axios = require("axios");
// fetching app info global variable while in global context
var DemoWss = false;
var DemoAppId = cloud_app_info_1.AppInfo && cloud_app_info_1.AppInfo["AppId"] ? cloud_app_info_1.AppInfo["AppId"] : "<no-app-id>";
var DemoAppVersion = cloud_app_info_1.AppInfo && cloud_app_info_1.AppInfo["AppVersion"] ? cloud_app_info_1.AppInfo["AppVersion"] : "1.0";
var DemoRegion = cloud_app_info_1.AppInfo && cloud_app_info_1.AppInfo.Region;
const PLAYER_SUMMARIES_URL = "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/";
const LILY_BF_STEAM_ID = "76561198317706228/"; // 76561199457523196 (LilyBF) | 76561198272162652 // (mine) 
const KNIGHTFALL_GAME_ID = "1911390";
const LILY_BF_STEAM_NAME = "SO?";
const IS_CURRENTLY_PLAYING_KNIGHTFALL = false;
const ALWAYS_BAN_LILYBF = true;
// const UPDATE_RATE = 2 * 60 * 1000; // 2 minutes
const UPDATE_RATE = 2 * 60 * 1000;
const GM_LOBBY_VIEW_ID = 29;
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}
if (!process.env.STEAM_API_KEY) {
    console.error('Invalid Steam API Key from ENV. Exiting...');
    process.exit(1);
}
class LilyBannedForever extends photon_1.Photon.LoadBalancing.LoadBalancingClient {
    constructor() {
        super(DemoWss ? photon_1.Photon.ConnectionProtocol.Wss : photon_1.Photon.ConnectionProtocol.Ws, DemoAppId, DemoAppVersion);
        this.logger = new photon_1.Photon.Logger();
        LilyBannedForever.instance = this;
        this.output(this.logger.format("Init", this.getNameServerAddress(), DemoAppId, DemoAppVersion));
        this.setLogLevel(photon_1.Photon.LogLevel.INFO);
    }
    start() {
        // Required since javascript var are not globals with node.js
        photon_1.Photon.PhotonPeer.setWebSocketImpl(WebSocket);
        this.connectToRegionMaster(DemoRegion);
        this.connectToNameServer({ region: DemoRegion, lobbyType: photon_1.Photon.LoadBalancing.Constants.LobbyType.Default });
    }
    stop() {
        // Close the Photon connection
        this.disconnect();
    }
    onError(errorCode, errorMsg) {
        this.output("Error " + errorCode + ": " + errorMsg);
        // Throw error to make sure the bot restarts
        throw new Error("Photon error: " + errorMsg + "Waiting for the app to restart...");
    }
    onEvent(code, content, actorNr) {
    }
    objToStr(x = {}) {
        var res = "";
        for (var i in x) {
            res += (res == "" ? "" : " ,") + i + "=" + x[i];
        }
        return res;
    }
    output(str, color) {
        var escaped = str.replace(/&/, "&amp;").replace(/</, "&lt;").
            replace(/>/, "&gt;").replace(/"/, "&quot;");
        this.logger.info(escaped);
    }
    onRoomListUpdate(rooms, roomsUpdated, roomsAdded, roomsRemoved) {
        // this.logger.info("Demo: onRoomListUpdate", rooms, roomsUpdated, roomsAdded, roomsRemoved);
        // this.output("Demo: Rooms update: " + roomsUpdated.length + " updated, " + roomsAdded.length + " added, " + roomsRemoved.length + " removed");
        this.logger.info("[LILY BF] RoomList Update");
    }
    onJoinRoom() {
        this.logger.info("[LILY BF] Joined Room !!!");
        this.sendRPC(GM_LOBBY_VIEW_ID, rpcList_1.KnightfallRPC.RPCA_RequestStartGame, -1, {});
    }
    onActorLeave(actorNr, actor) {
        this.logger.info("[LILY BF] Actor Leave !!!");
    }
    onStateChange(state) {
        // Note: we can't use onJoinLobby since it is not implemented in the LoadBalancingClient
        // Instead, we listen for the state change
        if (state === photon_1.Photon.LoadBalancing.LoadBalancingClient.State.JoinedLobby) {
            this.logger.info("[LILY BF] Joined Lobby !!!");
            // Join room now
            this.joinRandomRoom();
        }
    }
    sendRPC(viewID, knightfallRPC, targetActor, data) {
        // convert RPC to int
        const eventId = knightfallRPC;
        // Need to add GM_Lobby view id as target
        this.logger.info(`[LILY BF] Sending RPC: ${knightfallRPC} (${eventId}) to ${targetActor}`);
        let eventOptions = {};
        if (targetActor === -1) {
            eventOptions = {
                receivers: photon_1.Photon.LoadBalancing.Constants.ReceiverGroup.All,
            }; // Send to all players
        }
        else {
            eventOptions = {
                receivers: photon_1.Photon.LoadBalancing.Constants.ReceiverGroup.All,
                targetActors: targetActor,
            }; // Send to specific player
        }
        this.logger.info(`[LILY BF] with eventOptions: ${this.objToStr(eventOptions)}`);
        this.raiseEvent(200, RPCFactory.RPCA_StartGame(), eventOptions);
    }
}
exports.LilyBannedForever = LilyBannedForever;
LilyBannedForever.steamId = LILY_BF_STEAM_ID;
LilyBannedForever.currentSteamName = LILY_BF_STEAM_NAME;
class LilyBFHandler {
    constructor(interval) {
        this.interval = interval;
        this.banHandler = null;
    }
    enableBannedForever() {
        console.log("LilyBF is playing Knightfall. Enabling BannedForever...");
        this.banHandler = new LilyBannedForever();
        this.banHandler.start();
    }
    disableBannedForever() {
        console.log("LilyBF stopped playing Knightfall. Disabling BannedForever...");
        if (this.banHandler) {
            this.banHandler.stop();
            this.banHandler = null;
        }
    }
    checkActivity() {
        return __awaiter(this, void 0, void 0, function* () {
            // Use steam web api to get the current activity of LilyBF
            const response = yield axios.get(PLAYER_SUMMARIES_URL, {
                params: {
                    key: process.env.STEAM_API_KEY,
                    steamids: LILY_BF_STEAM_ID
                }
            });
            const data = response.data;
            if (data.response && data.response.players && data.response.players.length > 0) {
                const player = data.response.players[0];
                const isPlayingKnightfall = player.gameid && player.gameid === KNIGHTFALL_GAME_ID;
                // In the same time, update the username
                this.updateUsername(player.personaname);
                // Call the appropriate callback
                // if (!IS_CURRENTLY_PLAYING_KNIGHTFALL && isPlayingKnightfall) {
                // debug. to remove
                if (true) {
                    // Ensure we don't create multiple instances
                    if (!this.banHandler) {
                        this.enableBannedForever();
                    }
                }
                else if (IS_CURRENTLY_PLAYING_KNIGHTFALL && !isPlayingKnightfall) {
                    this.disableBannedForever();
                }
                else {
                    console.log(`No status change. LilyBF is still ${isPlayingKnightfall ? 'online' : 'offline'}.`);
                }
            }
            else {
                console.error('Error fetching Steam activity: No player data found');
            }
        });
    }
    updateUsername(newName) {
        if (newName && newName !== LilyBannedForever.currentSteamName) {
            LilyBannedForever.currentSteamName = newName;
            console.log(`New LilyBF username: ${newName}`);
        }
        else {
            console.log(`No change in LilyBF username: ${LilyBannedForever.currentSteamName}`);
        }
    }
    getPlayerViewIDFromActor(actor) {
        // viewId is 1001 for player 1, 2001 for player 2, etc.
        return 1000 * actor.actorNr + 1;
    }
    sendLooseRPC(actor) {
        const viewID = this.getPlayerViewIDFromActor(actor);
        const data = ["0", 0]; // TeamID = 0, roseGiverID = 0
        this.banHandler.sendRPC(viewID, rpcList_1.KnightfallRPC.RPCA_LoseGame, actor.actorNr, data);
    }
    static run() {
        return __awaiter(this, void 0, void 0, function* () {
            let detector = new LilyBFHandler(UPDATE_RATE);
            yield detector.checkActivity();
            setInterval(() => detector.checkActivity(), UPDATE_RATE); // Ensure `this` is bound
        });
    }
}
exports.LilyBFHandler = LilyBFHandler;
class RPCFactory {
    static RPCA_StartGame() {
        const args = {};
        args[0] = 29; // Use a number key directly instead of converting
        return args;
    }
    static toBytes(number) {
        if (!Number.isSafeInteger(number)) {
            throw new Error("Number is out of range");
        }
        const size = number === 0 ? 0 : byteLength(number);
        const bytes = new Uint8ClampedArray(size);
        let x = number;
        for (let i = (size - 1); i >= 0; i--) {
            const rightByte = x & 0xff;
            bytes[i] = rightByte;
            x = Math.floor(x / 0x100);
        }
        return bytes.buffer;
    }
}
exports.RPCFactory = RPCFactory;
