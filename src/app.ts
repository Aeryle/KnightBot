// @ts-nocheck
/// <reference path="Photon/photon.d.ts"/>
// import WebSocket from 'ws'; // DO NOT WORK
var WebSocket = require('ws'); // FROM NATIVE NODE.JS
import { managerToFetchingStrategyOptions } from 'discord.js';
import { AppInfo } from './cloud-app-info';
import { Photon } from './photon'; 

// fetching app info global variable while in global context
var DemoWss = false;
var DemoAppId = AppInfo && AppInfo["AppId"] ? AppInfo["AppId"] : "<no-app-id>";
var DemoAppVersion = AppInfo && AppInfo["AppVersion"] ? AppInfo["AppVersion"] : "1.0";
var DemoRegion = AppInfo && AppInfo.Region;

export class DemoLoadBalancing extends Photon.LoadBalancing.LoadBalancingClient {
    logger = new Photon.Logger();

    public static instance: DemoLoadBalancing;
    public static totalPlayers = -1;
    public static playersInGameOrQueue = -1;
    public static playersAfk = -1;
    public static totalGames = -1;
    public static countOfPlayersInCurrentQueue = -1;
    public static currentQueueRoomName = "";
    public static currentQueueTimeStart = -1;
    public static hasQueueConflict = false;
    public static potentialCurrentQueues: string[] = [];

    constructor() {
        super(DemoWss ? Photon.ConnectionProtocol.Wss : Photon.ConnectionProtocol.Ws, DemoAppId, DemoAppVersion);
        
        DemoLoadBalancing.instance = this;

        this.output(this.logger.format("Init", this.getNameServerAddress(), DemoAppId, DemoAppVersion));
        this.setLogLevel(Photon.LogLevel.INFO);
        
    }
    start() {
        // Required since javascript var are not globals with node.js
        Photon.PhotonPeer.setWebSocketImpl(WebSocket);

        this.connectToRegionMaster(DemoRegion || "US");
        this.connectToNameServer({ region: "US", lobbyType: Photon.LoadBalancing.Constants.LobbyType.Default });
    }
    onError(errorCode: number, errorMsg: string) {
        this.output("Error " + errorCode + ": " + errorMsg);
        // Throw error to make sure the bot restarts
        throw new Error("Photon error: " + errorMsg + "Waiting for the bot to restart...");
    }
    onEvent(code: number, content: any, actorNr: number) {
    }
    objToStr(x: Record<string, any> = {}) {
        var res = "";
        for (var i in x) {
            res += (res == "" ? "" : " ,") + i + "=" + x[i];
        }
        return res;
    }

    onRoomListUpdate(rooms: Photon.LoadBalancing.Room[], roomsUpdated: Photon.LoadBalancing.Room[], roomsAdded: Photon.LoadBalancing.Room[], roomsRemoved: Photon.LoadBalancing.Room[]) {
        // this.logger.info("Demo: onRoomListUpdate", rooms, roomsUpdated, roomsAdded, roomsRemoved);
        // this.output("Demo: Rooms update: " + roomsUpdated.length + " updated, " + roomsAdded.length + " added, " + roomsRemoved.length + " removed");
        this.onRoomListHandler(rooms, roomsAdded, roomsRemoved);
    }

    onRoomListHandler(rooms: Photon.LoadBalancing.Room[], roomsAdded: Photon.LoadBalancing.Room[], roomsRemoved: Photon.LoadBalancing.Room[]) {
        for (var i = 0; i < rooms.length;++i){
            var r = rooms[i];
            // We init the queue with the first open room we find
            // in case we didn't receive any 'room created' event yet.
            if (DemoLoadBalancing.currentQueueRoomName == "" && r.isOpen)
            {
                this.setNewCurrentQueue(r);
                break;
            }
            else if (DemoLoadBalancing.currentQueueRoomName == r.name)
            {
                DemoLoadBalancing.countOfPlayersInCurrentQueue = r.playerCount;
                break;
            }
        }

        if (roomsAdded.length == 1)
        {
            this.setNewCurrentQueue(roomsAdded[0]);
        }
        else if (roomsAdded.length > 1)
        {
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

        if (roomsRemoved.length > 0)
        {
            roomsRemoved.forEach(room => {
                if (DemoLoadBalancing.currentQueueRoomName == room.name)
                {
                    DemoLoadBalancing.currentQueueRoomName = "";
                    DemoLoadBalancing.countOfPlayersInCurrentQueue = -1;
                    DemoLoadBalancing.currentQueueTimeStart = -1;
                    this.output("[Queue] Current queue was cancelled by the only present player.");
                }
            });
        }
    }
    onAppStats(errorCode: number, errorMsg: string, stats: any) {
        var totalGames = parseInt(stats.gameCount);
        var totalPlayers =  parseInt(stats.peerCount) + parseInt(stats.masterPeerCount) - 1; // -1 because we are not a real player
        var playersAfk = parseInt(stats.masterPeerCount) - 1; // -1 because we are not a real player
        var playersInGameOrQueue = parseInt(stats.peerCount); // -1 because we are not a real player
        var playersInQueue = DemoLoadBalancing.countOfPlayersInCurrentQueue;
        var playersInGame = playersInGameOrQueue - playersInQueue;

        DemoLoadBalancing.totalPlayers = totalPlayers;
        DemoLoadBalancing.playersInGameOrQueue = playersInGameOrQueue;
        DemoLoadBalancing.playersAfk = playersAfk;
        DemoLoadBalancing.totalGames = totalGames;

        this.output("[Players]:"
                    + "\n\t- In Game: " + playersInGame
                    + "\n\t- In Queue: " + playersInQueue
                    + "\n\t- AFK: " + playersAfk
                    + "\n\t- Total: " + totalPlayers);
        this.output("[Games]: " + totalGames);
    }

    output(str: string, color?: string) {
        var escaped = str.replace(/&/, "&amp;").replace(/</, "&lt;").
        replace(/>/, "&gt;").replace(/"/, "&quot;");
        this.logger.info(escaped);
    }

    setNewCurrentQueue(room: Photon.LoadBalancing.Room)
    {
        DemoLoadBalancing.currentQueueRoomName = room.name;
        DemoLoadBalancing.countOfPlayersInCurrentQueue = room.playerCount;
        DemoLoadBalancing.currentQueueTimeStart = Date.now();
        this.output("[Queue] New queue: " + room.name);
    }
    
    resolveQueueConflict(updatedRooms: Photon.LoadBalancing.Room[])
    {
        // Knightfall uses JoinRoom(algorithm: full).
        // This means only one room should be updated even if multiple were created
        // at the same time
        updatedRooms.forEach(room => {
            if (DemoLoadBalancing.potentialCurrentQueues.includes(room.name))
            {
                this.output("Queue conflict resolved. Found correct queue: " + room.name);
                this.setNewCurrentQueue(room);
                DemoLoadBalancing.potentialCurrentQueues = [];
                DemoLoadBalancing.hasQueueConflict = false;
            }
        });

        if (DemoLoadBalancing.hasQueueConflict)
        {
            this.output("[Warning] Conflict couldn't be resolved...");
        }
    }

    public static getRemainingQueueTime() 
    {
        if (DemoLoadBalancing.currentQueueTimeStart == -1)
        {
            return QUEUE_DURATION;
        }

        var now = Date.now();
        var diff = now - DemoLoadBalancing.currentQueueTimeStart;
        var remaining = QUEUE_DURATION - (diff / 1000);
        return remaining;
    }
}

export class PhotonRunner
{
    public static run()
    {
        Photon.setOnLoad(() =>
            {
                new DemoLoadBalancing().start();
            }
        );
    }
}

export var MAX_PLAYERS = 28;
export var QUEUE_DURATION = 120;
/*
Photon.setOnLoad(() =>
    {
        
        new DemoLoadBalancing().start();
        setInterval(() => {}, 1000); // keep alive
    }
);
*/