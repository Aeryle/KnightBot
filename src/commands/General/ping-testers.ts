import { ApplyOptions } from '@sapphire/decorators'
import { Command } from '@sapphire/framework'
import { envParseString } from '@skyra/env-utilities'
import { InteractionContextType } from 'discord.js'

@ApplyOptions<Command.Options>({
  name: 'ping-testers',
  description: 'Ping Mod Testers',
  preconditions: ['VerifiedModderOnly'],
  runIn: 'GUILD_TEXT',
})
export class PingTestersCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder //
        .setName(this.name)
        .setDescription(this.description)
        .setContexts(InteractionContextType.Guild)
    )
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.inGuild()) return

    return interaction.reply({
      content: `<@&${envParseString('MOD_TESTER_ROLE_ID')}>`,
      // flags: dev ? MessageFlags.Ephemeral : [],
      allowedMentions: {
        roles: [envParseString('MOD_TESTER_ROLE_ID')],
      },
    })
  }
}
