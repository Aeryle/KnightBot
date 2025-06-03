"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QUEUE_DURATION = exports.MAX_PLAYERS = exports.PhotonRunner = exports.DemoLoadBalancing = void 0;
// @ts-nocheck
/// <reference path="Photon/photon.d.ts"/>
// import WebSocket from 'ws'; // DO NOT WORK
var WebSocket = require('ws'); // FROM NATIVE NODE.JS
const cloud_app_info_1 = require("./cloud-app-info");
const photon_1 = require("./photon");
// fetching app info global variable while in global context
var DemoWss = false;
var DemoAppId = cloud_app_info_1.AppInfo && cloud_app_info_1.AppInfo["AppId"] ? cloud_app_info_1.AppInfo["AppId"] : "<no-app-id>";
var DemoAppVersion = cloud_app_info_1.AppInfo && cloud_app_info_1.AppInfo["AppVersion"] ? cloud_app_info_1.AppInfo["AppVersion"] : "1.0";
var DemoRegion = cloud_app_info_1.AppInfo && cloud_app_info_1.AppInfo.Region;
class DemoLoadBalancing extends photon_1.Photon.LoadBalancing.LoadBalancingClient {
    constructor() {
        super(DemoWss ? photon_1.Photon.ConnectionProtocol.Wss : photon_1.Photon.ConnectionProtocol.Ws, DemoAppId, DemoAppVersion);
        this.logger = new photon_1.Photon.Logger();
        DemoLoadBalancing.instance = this;
        this.output(this.logger.format("Init", this.getNameServerAddress(), DemoAppId, DemoAppVersion));
        this.setLogLevel(photon_1.Photon.LogLevel.INFO);
    }
    start() {
        // Required since javascript var are not globals with node.js
        photon_1.Photon.PhotonPeer.setWebSocketImpl(WebSocket);
        this.connectToRegionMaster(DemoRegion || "US");
        this.connectToNameServer({ region: "US", lobbyType: photon_1.Photon.LoadBalancing.Constants.LobbyType.Default });
    }
    onError(errorCode, errorMsg) {
        this.output("Error " + errorCode + ": " + errorMsg);
        // Throw error to make sure the bot restarts
        throw new Error("Photon error: " + errorMsg + "Waiting for the bot to restart...");
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
    onRoomListUpdate(rooms, roomsUpdated, roomsAdded, roomsRemoved) {
        // this.logger.info("Demo: onRoomListUpdate", rooms, roomsUpdated, roomsAdded, roomsRemoved);
        // this.output("Demo: Rooms update: " + roomsUpdated.length + " updated, " + roomsAdded.length + " added, " + roomsRemoved.length + " removed");
        this.onRoomListHandler(rooms, roomsAdded, roomsRemoved);
    }
    onRoomListHandler(rooms, roomsAdded, roomsRemoved) {
        for (var i = 0; i < rooms.length; ++i) {
            var r = rooms[i];
            // We init the queue with the first open room we find
            // in case we didn't receive any 'room created' event yet.
            if (DemoLoadBalancing.currentQueueRoomName == "" && r.isOpen) {
                this.setNewCurrentQueue(r);
                break;
            }
            else if (DemoLoadBalancing.currentQueueRoomName == r.name) {
                DemoLoadBalancing.countOfPlayersInCurrentQueue = r.playerCount;
                break;
            }
        }
        if (roomsAdded.length == 1) {
            this.setNewCurrentQueue(roomsAdded[0]);
        }
        else if (roomsAdded.length > 1) {
            this.output("[Warning] More than 1 room is open. This should not happen");
            // TO-DO: Keep the queue with the more players
            // Find the room with the most players and set it as the current queue
            var roomWithMostPlayers = roomsAdded.reduce((prev, current) => (prev.playerCount > current.playerCount) ? prev : current);
            this.setNewCurrentQueue(roomWithMostPlayers);
            DemoLoadBalancing.hasQueueConflict = true;
            roomsAdded.forEach(room => {
                DemoLoadBalancing.potentialCurrentQueues.push(room.name);
            });
        }
        if (roomsRemoved.length > 0) {
            roomsRemoved.forEach(room => {
                if (DemoLoadBalancing.currentQueueRoomName == room.name) {
                    DemoLoadBalancing.currentQueueRoomName = "";
                    DemoLoadBalancing.countOfPlayersInCurrentQueue = 0;
                    DemoLoadBalancing.currentQueueTimeStart = -1;
                    this.output("[Queue] Current queue was cancelled by the only present player.");
                }
            });
        }
    }
    onAppStats(errorCode, errorMsg, stats) {
        var totalGames = parseInt(stats.gameCount);
        var totalPlayers = parseInt(stats.peerCount) + parseInt(stats.masterPeerCount) - 1; // -1 because we are not a real player
        var playersAfk = parseInt(stats.masterPeerCount) - 1; // -1 because we are not a real player
        var playersInGameOrQueue = parseInt(stats.peerCount); // -1 because we are not a real player
        var playersInQueue = DemoLoadBalancing.countOfPlayersInCurrentQueue;
        var playersInGame = playersInGameOrQueue - playersInQueue;
        DemoLoadBalancing.totalPlayers = totalPlayers;
        DemoLoadBalancing.playersInGameOrQueue = playersInGameOrQueue;
        DemoLoadBalancing.playersAfk = playersAfk;
        DemoLoadBalancing.totalGames = totalGames;
        /* Remove these logs to reduce memory usage
        this.output("[Players]:"
                    + "\n\t- In Game: " + playersInGame
                    + "\n\t- In Queue: " + playersInQueue
                    + "\n\t- AFK: " + playersAfk
                    + "\n\t- Total: " + totalPlayers);
        this.output("[Games]: " + totalGames);
        */
    }
    output(str, color) {
        var escaped = str.replace(/&/, "&amp;").replace(/</, "&lt;").
            replace(/>/, "&gt;").replace(/"/, "&quot;");
        this.logger.info(escaped);
    }
    setNewCurrentQueue(room) {
        DemoLoadBalancing.currentQueueRoomName = room.name;
        DemoLoadBalancing.countOfPlayersInCurrentQueue = room.playerCount;
        DemoLoadBalancing.currentQueueTimeStart = Date.now();
        this.output("[Queue] New queue: " + room.name);
    }
    resolveQueueConflict(updatedRooms) {
        // Knightfall uses JoinRoom(algorithm: full).
        // This means only one room should be updated even if multiple were created
        // at the same time
        updatedRooms.forEach(room => {
            if (DemoLoadBalancing.potentialCurrentQueues.includes(room.name)) {
                this.output("Queue conflict resolved. Found correct queue: " + room.name);
                this.setNewCurrentQueue(room);
                DemoLoadBalancing.potentialCurrentQueues = [];
                DemoLoadBalancing.hasQueueConflict = false;
            }
        });
        if (DemoLoadBalancing.hasQueueConflict) {
            this.output("[Warning] Conflict couldn't be resolved...");
        }
    }
    static getRemainingQueueTime() {
        if (DemoLoadBalancing.currentQueueTimeStart == -1) {
            return exports.QUEUE_DURATION;
        }
        var now = Date.now();
        var diff = now - DemoLoadBalancing.currentQueueTimeStart;
        var remaining = exports.QUEUE_DURATION - (diff / 1000);
        return remaining;
    }
}
exports.DemoLoadBalancing = DemoLoadBalancing;
DemoLoadBalancing.totalPlayers = -1;
DemoLoadBalancing.playersInGameOrQueue = -1;
DemoLoadBalancing.playersAfk = -1;
DemoLoadBalancing.totalGames = -1;
DemoLoadBalancing.countOfPlayersInCurrentQueue = -1;
DemoLoadBalancing.currentQueueRoomName = "";
DemoLoadBalancing.currentQueueTimeStart = -1;
DemoLoadBalancing.hasQueueConflict = false;
DemoLoadBalancing.potentialCurrentQueues = [];
class PhotonRunner {
    static run() {
        photon_1.Photon.setOnLoad(() => {
            new DemoLoadBalancing().start();
        });
    }
}
exports.PhotonRunner = PhotonRunner;
exports.MAX_PLAYERS = 28;
exports.QUEUE_DURATION = 120;
/*
Photon.setOnLoad(() =>
    {
        
        new DemoLoadBalancing().start();
        setInterval(() => {}, 1000); // keep alive
    }
);
*/ 
