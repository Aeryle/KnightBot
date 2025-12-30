import { AllFlowsPrecondition } from '@sapphire/framework'
import { envParseString } from '@skyra/env-utilities'
import {
  GuildMemberRoleManager,
  type ChatInputCommandInteraction,
  type ContextMenuCommandInteraction,
  type Message,
} from 'discord.js'

const VERIFIED_MODDER_ROLE_ID = envParseString('VERIFIED_MODDER_ROLE_ID')

export class VerifiedModderOnlyPrecondition extends AllFlowsPrecondition {
  #message = `This command can only be used by <${VERIFIED_MODDER_ROLE_ID}>`

  public override chatInputRun(interaction: ChatInputCommandInteraction) {
    if (!interaction.inGuild()) return this.doError()

    const roles = interaction.member.roles
    if (roles instanceof GuildMemberRoleManager) return this.doRoleCheck(roles.cache.has(VERIFIED_MODDER_ROLE_ID))
    else return this.doRoleCheck(roles.includes(VERIFIED_MODDER_ROLE_ID))
  }

  public override async contextMenuRun(interaction: ContextMenuCommandInteraction) {
    if (!interaction.inGuild()) return this.doError()

    const roles = interaction.member.roles
    if (roles instanceof GuildMemberRoleManager) return this.doRoleCheck(roles.cache.has(VERIFIED_MODDER_ROLE_ID))
    else return this.doRoleCheck(roles.includes(VERIFIED_MODDER_ROLE_ID))
  }

  public override async messageRun(message: Message) {
    const member = await message.member?.fetch()
    if (!member) return this.doError()

    return this.doRoleCheck(member.roles.cache.has(VERIFIED_MODDER_ROLE_ID))
  }

  private doRoleCheck(hasRole: boolean) {
    return hasRole ? this.ok() : this.error({ message: this.#message, context: { silent: true } })
  }

  private doError() {
    return this.error({ message: this.#message, context: { silent: true } })
  }
}

declare module '@sapphire/framework' {
  interface Preconditions {
    VerifiedModderOnly: never
  }
}
