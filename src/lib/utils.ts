import type {
  ChatInputCommandSuccessPayload,
  Command,
  ContextMenuCommandSuccessPayload,
  MessageCommandSuccessPayload,
} from '@sapphire/framework'
import { container } from '@sapphire/framework'
import { cyan } from 'colorette'
import { type APIUser, type Guild, type User } from 'discord.js'

/**
 * Picks a random item from an array
 * @param array The array to pick a random item from
 * @example
 * const randomEntry = pickRandom([1, 2, 3, 4]) // 1
 */
export const pickRandom = <T>(array: readonly T[]): T => {
  const { length } = array

  return array[Math.floor(Math.random() * length)]
}

export const logSuccessCommand = (
  payload: ContextMenuCommandSuccessPayload | ChatInputCommandSuccessPayload | MessageCommandSuccessPayload
) => {
  let successLoggerData: ReturnType<typeof getSuccessLoggerData>

  if ('interaction' in payload) {
    successLoggerData = getSuccessLoggerData(payload.interaction.guild, payload.interaction.user, payload.command)
  } else {
    successLoggerData = getSuccessLoggerData(payload.message.guild, payload.message.author, payload.command)
  }

  container.logger.debug(
    `${successLoggerData.shard} - ${successLoggerData.commandName} ${successLoggerData.author} ${successLoggerData.sentAt}`
  )
}

export function getSuccessLoggerData(guild: Guild | null, user: User, command: Command) {
  const shard = getShardInfo(guild?.shardId ?? 0)
  const commandName = getCommandInfo(command)
  const author = getAuthorInfo(user)
  const sentAt = getGuildInfo(guild)

  return { shard, commandName, author, sentAt }
}

const getShardInfo = (id: number) => {
  return `[${cyan(id.toString())}]`
}

const getCommandInfo = (command: Command) => {
  return cyan(command.name)
}

const getAuthorInfo = (author: User | APIUser) => {
  return `${author.username}[${cyan(author.id)}]`
}

const getGuildInfo = (guild: Guild | null) => {
  if (guild === null) return 'Direct Messages'
  return `${guild.name}[${cyan(guild.id)}]`
}

export function toFixed(value: number) {
  return parseFloat(value.toFixed(2))
}
