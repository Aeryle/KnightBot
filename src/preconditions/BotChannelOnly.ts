import { AllFlowsPrecondition } from '@sapphire/framework'
import { envParseString } from '@skyra/env-utilities'
import {
  channelMention,
  ChatInputCommandInteraction,
  ContextMenuCommandInteraction,
  Message,
  Snowflake,
} from 'discord.js'

const botChannelId = envParseString('BOT_CHANNEL_ID')

export class BotChannelOnlyPrecondition extends AllFlowsPrecondition {
  #message = `This command can only be ran in ${channelMention(botChannelId)}`

  override chatInputRun(interaction: ChatInputCommandInteraction) {
    return this.doChannelCheck(interaction.channelId)
  }

  override contextMenuRun(interaction: ContextMenuCommandInteraction) {
    return this.doChannelCheck(interaction.channelId)
  }

  override messageRun(message: Message) {
    return this.doChannelCheck(message.channelId)
  }

  private doChannelCheck(channelId: Snowflake) {
    return channelId === botChannelId ? this.ok() : this.error({ message: this.#message })
  }
}

declare module '@sapphire/framework' {
  interface Preconditions {
    BotChannelOnly: never
  }
}
