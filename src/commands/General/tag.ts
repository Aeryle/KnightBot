import { ApplyOptions } from '@sapphire/decorators'
import { Command } from '@sapphire/framework'
import { bold, Colors, EmbedBuilder, MessageFlags } from 'discord.js'

import { dev } from '$lib/constants'
import { toFixed } from '$lib/utils'

@ApplyOptions<Command.Options>({
  name: 'tag',
  description: "Number of users using the server's tag",
})
export class UserCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(builder =>
      builder //
        .setName(this.name)
        .setDescription(this.description)
    )
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    if (!interaction.inGuild()) return

    const tagName = interaction.guild?.members.cache.find(({ user }) => {
      return user.primaryGuild?.identityGuildId === interaction.guildId
    })?.user.primaryGuild?.tag
    if (!tagName) {
      const embed = new EmbedBuilder().setColor(Colors.DarkRed).setDescription('Could not get server tag')

      return interaction.reply({
        embeds: [embed],
        flags: dev ? MessageFlags.Ephemeral : [],
      })
    }

    // TODO: Come back to this when Discord.js finally implements it through the Guild itself
    const tagUsersAmount =
      interaction.guild?.members.cache.reduce((total, { user }) => {
        return user.primaryGuild?.identityGuildId === interaction.guildId ? total + 1 : total
      }, 0) ?? 0

    const tagUsersPercentage = toFixed((tagUsersAmount / interaction.guild.memberCount!) * 100)

    return interaction.reply({
      content: `${bold(tagUsersAmount.toString())}/${bold(interaction.guild!.memberCount.toString())} (${bold(`${tagUsersPercentage}%`)}) ${tagName} tag users.`,
      flags: dev ? MessageFlags.Ephemeral : [],
    })
  }
}
