/**
  @summary Log levels.
  @enum {number}
  @readonly
  @property {number} OFF Logging off.
  @property {number} ERROR
  @property {number} WARN
  @property {number} INFO
  @property {number} DEBUG All logging is enabled.
*/
export enum LogLevel {
  OFF,
  ERROR,
  WARN,
  INFO,
  DEBUG,
}

export type ExceptionHandler = (code: number, message: string) => boolean

/**
  @classdesc Logger
  @summary Prints messages to browser console.
  Each logging method perfoms toString() calls and default formatting of arguments only after it checks logging level. Therefore disabled level logging method call with plain arguments doesn't involves much overhead.
  But if one prefer custom formatting or some calculation for logging methods arguments he should check logging level before doing this to avoid unnecessary operations:
  if(logger.isLevelEnabled(LogLevel.DEBUG)) {
      logger.debug("", someCall(x, y), x + "," + y);
  }
  @constructor Logger
  */
export class Logger {
  private prefix: string
  private level: LogLevel
  private exceptionHandler?: ExceptionHandler

  /**
    @param {string} [prefix=''] All log messages will be prefixed with that.
    @param {LogLevel} [level=LogLevel.INFO] Initial logging level.
  */
  constructor(prefix: string = '', level: LogLevel = LogLevel.DEBUG) {
    this.prefix = prefix
    this.level = level
  }

  /**
    @summary Sets logger prefix.
    @method Logger#setPrefix
    @param {string} prefix New prefix.
  */
  setPrefix(prefix: string) {
    this.prefix = prefix
  }

  /**
    @summary Gets logger prefix.
    @method Logger#getPrefix
    @returns {string} Prefix.
  */
  getPrefix(): string {
    return this.prefix
  }

  /**
    @summary Changes current logging level.
    @method Logger#setLevel
    @param {LogLevel} level New logging level.
  */
  setLevel(level: LogLevel) {
    this.level = level
  }

  /**
    @summary Returns current logging level.
    @method Logger#getLevel
    @returns {LogLevel} Current logging level.
  */
  getLevel(): LogLevel {
    return this.level
  }

  /**
    @summary Checks if logging level active.
    @method Logger#isLevelEnabled
    @param {LogLevel} level Level to check.
    @returns {boolean} True if level active.
  */
  isLevelEnabled(level: LogLevel): boolean {
    return level <= this.level
  }

  /**
    @summary Sets global method to be called on logger.exception call.
    @method Logger#setExceptionHandler
    @param {ExceptionHandler} handler Exception handler. Return true to cancel throwing.
  */
  setExceptionHandler(handler: ExceptionHandler) {
    this.exceptionHandler = handler
  }

  private format0(message: string, ...optionalParams: unknown[]) {
    const prefix = this.prefix ? `${this.prefix} ` : ''
    const params = optionalParams
      .filter(x => x !== undefined)
      .map(x => {
        if (typeof x === 'object' && x !== null) {
          try {
            return JSON.stringify(x)
          } catch (error) {
            return `${x.toString()}(${error})`
          }
        }
        return x?.toString() ?? ''
      })
      .join(' ')

    return `${prefix}${message} ${params}`.trim()
  }

  /**
    @summary Applies default logger formatting to array of objects.
    @method Logger#format
    @param {string} mess String to start formatting with.
    @param {unknown[]} optionalParams For every additional parameter toString() applies and result added to the end of formatted string after space character.
    @returns {string} Formatted string.
  */
  formatArr(message: string, ...optionalParams: unknown[]): string {
    return this.format0(message, ...optionalParams)
  }

  /**
    @summary Applies default logger formatting to arguments
    @method Logger#format
    @param {string} message String to start formatting with.
    @param {...unknown} optionalParams For every additional parameter toString() applies and result added to the end of formatted string after space character.
    @returns {string} Formatted string.
  */
  format(message: string, ...optionalParams: unknown[]): string {
    return this.format0(message, ...optionalParams)
  }

  private log(level: LogLevel, message: string, ...optionalParams: unknown[]) {
    if (level > this.level) return

    switch (level) {
      case LogLevel.OFF:
        break
      case LogLevel.ERROR:
        console.error(message, ...optionalParams)
        break
      case LogLevel.WARN:
        console.warn(message, ...optionalParams)
        break
      case LogLevel.INFO:
        console.info(message, ...optionalParams)
        break
      case LogLevel.DEBUG:
        console.debug(message, ...optionalParams)
        break
    }
  }

  /**
    @summary Logs message if logging level = DEBUG, INFO, WARN, ERROR
    @method Logger#debug
    @param {string} message Message to log.
    @param {...never} optionalParams For every additional parameter toString() applies and result added to the end of log message after space character.
  */
  debug(message: string, ...optionalParams: unknown[]) {
    this.log(LogLevel.DEBUG, message, ...optionalParams)
  }

  /**
    @summary Logs message if logging level = INFO, WARN, ERROR
    @method Logger#info
    @param {string} message Message to log.
    @param {...unknown} optionalParams For every additional parameter toString() applies and result added to the end of log message after space character.
  */
  info(message: string, ...optionalParams: unknown[]) {
    this.log(LogLevel.INFO, message, ...optionalParams)
  }

  /**
   @summary Logs message if logging level = WARN, ERROR
   @method Logger#warn
   @param {string} message Message to log.
   @param {...unknown} optionalParams For every additional parameter toString() applies and result added to the end of log message after space character.
   */
  warn(message: string, ...optionalParams: unknown[]) {
    this.log(LogLevel.WARN, message, ...optionalParams)
  }

  /**
    @summary Logs message if logging level = ERROR
    @method Logger#error
    @param {string} message Message to log.
    @param {...unknown} optionalParams For every additional parameter toString() applies and result added to the end of log message after space character.
  */
  error(message: string, ...optionalParams: unknown[]) {
    this.log(LogLevel.ERROR, message, ...optionalParams)
  }

  /**
   @summary Throws an Error or executes exception handler if set.
   @method Logger#exception
   @param {string} code Code passed to Error or exception handler.
   @param {string} message Message passed to Error or exception handler.
   @param {...unknown} optionalParams For every additional parameter toString() applies and result added to the end of log message after space character.
   */
  exception(code: number, message: string, ...optionalParams: unknown[]) {
    if (this.exceptionHandler?.(code, this.format0(message, optionalParams))) return

    throw new Error(this.format0(`[${code}] ${message}`, ...optionalParams))
  }
}
