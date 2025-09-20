import { objectKeys } from '@sapphire/utilities'

import { Logger } from './logger'

export type OnLoadCallback = () => void
/**
  @summary These are the options that can be used as underlying transport protocol.
  @member ConnectionProtocol
  @property {number} Ws WebSockets connection.
  @property {number} Wss WebSockets Secure connection.
*/
export enum ConnectionProtocol {
  Ws,
  Wss,
}

/**
  @summary Sets the callback to be called on Photon Voice library load finish.
  @method setOnLoad
  @readonly
  @param {OnLoadCallback} onLoad Callback.
*/
export const setOnLoad = (onLoad: OnLoadCallback) => {
  onLoad()
}

export const version = '4.4'

type WebsocketImpl = new (url: string, protocols?: string) => WebSocket
interface SendData {
  req: number
  vals: unknown[]
  [key: string]: unknown
}

/**
  @summary Enum for peer status codes.
  Use to subscribe to status changes.
  @readonly
  @property {string} connecting Is connecting to server.
  @property {string} connect Connected to server.
  @property {string} connectFailed Connection to server failed.
  @property {string} disconnect Disconnected from server.
  @property {string} connectClosed Connection closed by server.
  @property {string} error General connection error.
  @property {string} timeout Disconnected from server for timeout.
*/
export enum StatusCodes {
  connecting = 'connecting',
  connect = 'connect',
  connectFailed = 'connectFailed',
  disconnect = 'disconnect',
  connectClosed = 'connectClosed',
  error = 'error',
  timeout = 'timeout',
}
/**
  @classdesc Instances of the PhotonPeer class are used to connect to a Photon server and communicate with it.
  A PhotonPeer instance allows communication with the Photon Server, which in turn distributes messages to other PhotonPeer clients.
  An application can use more than one PhotonPeer instance, which are treated as separate users on the server.
  Each should have its own listener instance, to separate the operations, callbacks and events.
  @constructor PhotonPeer
  @param {ConnectionProtocol} protocol Connection protocol.
  @param {string} address Server address:port.
  @param {string} [subprotocol=''] WebSocket protocol.
  @param {string} [debugName=''] Log messages prefixed with this value.
*/
export class PhotonPeer {
  protocol: ConnectionProtocol
  address: string
  subprotocol: string
  debugName: string
  url: string
  webSocketImpl: WebsocketImpl = WebSocket

  /**
   @summary Peer sends 'keep alive' message to server as this timeout exceeded after last send operation.
   Set it < 1000 to disable 'keep alive' operation
   @member PhotonPeer#keepAliveTimeoutMs
   @type {number}
   @default 3000
   */
  keepAliveTimeoutMs: number = 3000
  initTimestamp = Date.now()
  serverTimeBaseLock = false // if true, do not update serverTimeBase on ping response to keep getServerTime() continuous.
  serverTimeBase = 0 // to avoid discontinuity in server time value, we calculate server time based on the first update only.
  serverTimeBaseTimestamp = Date.now()
  keepAliveTimer = 0
  // url = this.addProtocolPrefix(address, protocol)

  private _frame = '~m~'
  private _isConnecting = false
  private _isConnected = false
  private _isClosing = false
  private _peerStatusListeners: Record<number | string, unknown> = {}
  private _eventListeners: Record<number | string, unknown> = {}
  private _responseListeners: Record<number | string, unknown> = {}
  private _logger: Logger
  private _socket?: WebSocket
  private lastRtt = 0
  private _sessionid?: number

  constructor(protocol: ConnectionProtocol, address: string, subprotocol = '', debugName = '') {
    this.protocol = protocol
    this.address = address
    this.subprotocol = subprotocol
    this.debugName = debugName
    this.url = this.addProtocolPrefix(this.address, objectKeys(ConnectionProtocol)[this.protocol])
    this._logger = new Logger(debugName != '' ? debugName + ':' : '')
  }

  setWebsocketImpl(impl: WebsocketImpl) {
    this.webSocketImpl = impl
  }

  addProtocolPrefix(address: string, protocol: keyof typeof ConnectionProtocol) {
    const protocolPrefix: Record<keyof typeof ConnectionProtocol, string> = {
      Ws: 'ws://',
      Wss: 'wss://',
    }

    for (const key in protocolPrefix) {
      if (address.indexOf(protocolPrefix[key as keyof typeof ConnectionProtocol]) === 0) return address
    }

    return `${protocolPrefix[protocol]}${address}`
  }

  Destroy() {}

  /**
    @summary Checks if peer is connecting.
    @returns {boolean} True if peer is connecting.
  */
  isConnecting(): boolean {
    return this._isConnecting
  }

  getRtt() {
    return this.lastRtt
  }

  getServerTimeMs() {
    return (this.serverTimeBase + (Date.now() - this.serverTimeBaseTimestamp)) >> 0
  } // >> 0 is signed Int32 shift, it rounds the number and wraps to Int32 range

  // normally we sync server time only on connection
  ping(syncServerTime = false) {
    if (syncServerTime) this.serverTimeBaseLock = false

    // send time from peer creation to avoid timestamp overflow on server side
    // this._ping(((_a = {}), (_a['irq'] = 1), (_a['vals'] = [1, Date.now() - this.initTimestamp]), _a), true)
  }

  resetKeepAlive() {
    if (this.keepAliveTimeoutMs >= 1000) {
      this.keepAliveTimer = setTimeout(() => {
        this._ping(false)
      })
    }
  }

  /**
    @summary Checks if peer is connected.
    @returns {boolean} True if peer is connected.
  */
  isConnected(): boolean {
    return this._isConnected
  }

  /**
    @summary Checks if peer is closing.
    @returns {boolean} True if peer is closing.
  */
  isClosing(): boolean {
    return this._isClosing
  }

  /**
    @summary Starts connection to server.
  */
  connect(appId: string) {
    this._sessionid = undefined
    const url = `${this.url}/${appId}?libversion=${version}`
    const impl = this.webSocketImpl

    this._socket = new impl(url, this.subprotocol || 'Json')
    // TODO: Implement this._onConnecting()

    // Set event handlers.
    this._socket.onmessage = event => {
      // TODO: Implement this._decode()
      // const message = this._decode(message.data)
      // TODO: Implement this._onMessage()
      // this._onMessage(message.toString())
    }

    this._socket.onclose = event => {
      this._logger.debug('onclose: wasClean =', event.wasClean, ', code =', event.code, ', reason =', event.reason)

      if (this._isConnecting) {
        // TODO: Implement this.onConnectFailed(event)
        // this._onConnectFailed(event)
      } else {
        if (event.code === 1006) {
          // TODO: Implement this._onTimeout()
          // this._onTimeout()
        }

        // TODO: Implement this._onDisconnect()
        // this._onDisconnect()
      }
    }

    this._socket.onerror = event => {
      // TODO: Implement this._onError(event)
      // this._onError(event)
    }
  }

  /**
    @summary Disconnects from server.
  */
  disconnect() {
    this._isClosing = true
    this._socket?.close()
  }

  /**
      @summary Sends operation to the Photon Server.
      @param {number} code Code of operation.
      @param {object} [data] Parameters of operation as a flattened array of key-value pairs: [key1, value1, key2, value2...]
      @param {boolean} [sendReliable=false] Selects if the operation must be acknowledged or not. If false, the operation is not guaranteed to reach the server.
      @param {number} [channelId=0] The channel in which this operation should be sent.
    */
  sendOperation(code: number, data: unknown, sendReliable: boolean = false, channelId: number = 0) {
    const sendJson: SendData = {
      req: code,
      vals: [],
    }

    if (Array.isArray(data)) sendJson.vals = data
    else if (data !== undefined) {
      this._logger.exception(201, 'PhotonPeer[sendOperation] - Trying to send non array data:', data)
    }

    this._send(sendJson)
    this._logger.debug('PhotonPeer[sendOperation] - Sending request:', sendJson)
  }

  /**
    @summary Registers listener for peer status change.
    @param {StatusCodes} statusCode Status change to this value will be listening.
    @param {Function} callback The listener function that processes the status change. This function don't accept any parameters.
  */
  addPeerStatusListener(statusCode: StatusCodes, callback: () => void) {
    // TODO: Implement this._addListener()
    // this._addListener(this._peerStatusListeners, statusCode, callback)
  }

  /**
   @summary Registers listener for custom event.
   @param {number} eventCode Custom event code.
   @param {Function} callback The listener function that processes the event. This function may accept object with event content.
   */
  addEventListener(eventCode: number, callback: () => void) {
    // TODO: Implement this._addListener()
    // this._addListener(this._peerStatusListeners, eventCode.toString(), callback)
  }

  private _dispatch() {}
  private _dispatchEvent(code: number, ...args: unknown[]) {}

  private _stringify(message: object) {
    if (Object.prototype.toString.call(message) == '[object Object]') return `~j~${JSON.stringify(message)}`

    return String(message)
  }

  private _encode(messages: unknown | unknown[]) {
    let output = ''

    for (const message of Array.isArray(messages) ? messages : [messages]) {
      // output += this._frame + message.length + this._frame + message
      output += `${this._frame}${message.length}${this._frame}${message}`
    }

    return output
  }

  private _send(data: SendData, checkConnected = false) {
    const message = this._encode(data)

    if (this._socket && this._isConnected && !this._isClosing) {
      this.resetKeepAlive()
      this._socket.send(message)
    } else {
      if (checkConnected) return

      this._logger.exception(
        203,
        'PhotonPeer[_send] - Operation',
        data.req,
        '- failed, "isConnected" is',
        this._isConnected,
        ', "isClosing" is',
        this._isClosing,
        '!'
      )
    }
  }

  private _ping(syncServerTime = false) {
    if (syncServerTime) this.serverTimeBaseLock = false

    const data: SendData = {
      irq: 1,
      vals: [1, Date.now() - this.initTimestamp],
    }
    this._send(data)
  }
}
