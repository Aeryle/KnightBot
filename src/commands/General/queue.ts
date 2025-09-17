import { ApplyOptions } from '@sapphire/decorators'
import { ApplicationCommandRegistry, Command } from '@sapphire/framework'
import { objectKeys } from '@sapphire/utilities'
import { bold, ChatInputCommandInteraction, Colors, EmbedBuilder, MessageFlags } from 'discord.js'

import { dev } from '$lib/constants'
import { queueDetectors, Regions } from '$lib/queue-detector'

@ApplyOptions<Command.Options>({
  name: 'queue',
  description: 'Current queue and number of active players (defaults to NA). AFK players are not included.',
  preconditions: ['BotChannelOnly'],
})
export class QueueCommand extends Command {
  override registerApplicationCommands(registry: ApplicationCommandRegistry) {
    registry.registerChatInputCommand(builder => {
      return builder
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption(builder => {
          builder = builder.setName('region').setDescription('Select which region to see the queue of.')

          for (const name of objectKeys(queueDetectors)) {
            builder = builder.addChoices({ name, value: name })
          }

          return builder
        })
    })
  }

  override async chatInputRun(interaction: ChatInputCommandInteraction) {
    const region = (interaction.options.getString('region') ?? 'NA') as keyof typeof queueDetectors
    const queueDetector = queueDetectors[region]

    const inGameOrQueue = queueDetector.players.inGameOrQueue ?? 0

    const description = [`${bold('Active players')}: ${inGameOrQueue}`]
    if (queueDetector.currentQueue) {
      const timer = (Date.now() - queueDetector.currentQueue.timer) / 1_000

      description.push(
        `${bold('Active queue')}: ${bold(queueDetector.currentQueue.players.toString())}/${bold('28')}. Starting in ${bold(timer.toString())} seconds...`
      )
    } else description.push('No active queue.')

    const embed = new EmbedBuilder()
      .setColor(this.getColor(inGameOrQueue))
      .setTitle(`${region} queue`)
      .setDescription(description.join('\n'))

    interaction.reply({ embeds: [embed], flags: dev ? [MessageFlags.Ephemeral] : [] })
  }

  private getColor(players: number) {
    if (players < 4) return Colors.DarkRed
    if (players < 28) return Colors.Red
    if (players < 56) return Colors.DarkOrange
    if (players < 84) return Colors.Orange
    if (players < 112) return Colors.DarkGreen
    if (players < 140) return Colors.Green

    return Colors.Gold
  }
}
