import { envParseString } from '@skyra/env-utilities'

import { Photon } from '$lib/photon'

import { dev } from './constants'

export const appId = envParseString('PHOTON_APP_ID', '<no-app-id>')
export const appVersion = envParseString('PHOTON_APP_VERSION', '1.0')

export enum Regions {
  NA = 'US',
  EU = 'EU',
}

interface Queue {
  name: string
  players: number
  timer: number
}

export class QueueDetector extends Photon.LoadBalancing.LoadBalancingClient {
  override logger: Photon.Logger

  totalGames?: number
  players = { inGameOrQueue: -1 }
  currentQueue?: Queue | null
  hasQueueConflict = false
  potentiallyBuggedQueues: string[] = []
  countOfPlayersInCurrentQueue: number = 0

  constructor(region: Regions) {
    super(Photon.ConnectionProtocol.Ws, appId, appVersion)

    this.logger = new Photon.Logger(`[${region}]`, dev ? Photon.LogLevel.DEBUG : Photon.LogLevel.INFO)
    this.logger.debug(`Init ${this.getNameServerAddress()}`)

    this.connectToRegionMaster(region)
    this.connectToNameServer({
      region,
      lobbyType: Photon.LoadBalancing.Constants.LobbyType.Default,
    })
  }

  override onAppStats(errorCode: number, errorMsg: string, stats: Record<string, string>) {
    /** Count of players currently online on Game servers. */
    const peers = parseInt(stats.peerCount) - 1 // Remove 1 since we are not an actual player
    // /** Count of players on Master server (looking for game). */
    // const masterPeers = parseInt(stats.peerCount)

    this.players = { inGameOrQueue: peers }
  }

  override onRoomListUpdate(
    rooms: Photon.LoadBalancing.RoomInfo[],
    roomsUpdated: Photon.LoadBalancing.RoomInfo[],
    roomsAdded: Photon.LoadBalancing.RoomInfo[],
    roomsRemoved: Photon.LoadBalancing.RoomInfo[]
  ) {
    this.logger.debug('Rooms updated:', rooms.length, rooms[0]?.name, roomsUpdated, roomsAdded, roomsRemoved)

    for (const room of rooms) {
      if (!this.currentQueue?.name && room.isOpen) {
        this.setNewCurrentQueue(room)
        break
      } else if (this.currentQueue?.name === room.name) {
        this.currentQueue.players = room.playerCount
        break
      }
    }

    if (roomsAdded.length === 1) this.setNewCurrentQueue(roomsAdded[0])
    else if (roomsAdded.length > 1) {
      this.logger.warn('More than 1 room is open. This should not happen')

      const mostFilledRoom = roomsAdded.reduce((previous, current) => {
        return previous.playerCount > current.playerCount ? previous : current
      })
      this.setNewCurrentQueue(mostFilledRoom)

      this.hasQueueConflict = true
      for (const room of roomsAdded) this.potentiallyBuggedQueues.push(room.name)
    }

    if (roomsRemoved.length) {
      for (const room of roomsRemoved) {
        this.potentiallyBuggedQueues = this.potentiallyBuggedQueues.filter(queue => queue !== room.name)
        if (this.currentQueue?.name === room.name) this.currentQueue = null
      }
    }
  }

  private setNewCurrentQueue({ name, playerCount }: Photon.LoadBalancing.RoomInfo) {
    this.currentQueue = {
      name: name,
      players: playerCount,
      timer: Date.now(),
    }

    this.logger.info(`New queue ${name}`)
  }
}

export const queueDetectors = {
  NA: new QueueDetector(Regions.NA),
  EU: new QueueDetector(Regions.EU),
} satisfies Partial<Record<keyof typeof Regions, QueueDetector>>
