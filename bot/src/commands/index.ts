import type * as Discord from 'discord.js'
import { colors } from '../utils'
import type { CommandFn } from './utils'
import { info } from './info'
import { kif } from './kif'

const commands: Record<string, CommandFn> = {
	info,
	help,
	kif,
} as const

async function help(
	interaction: Discord.CommandInteraction<Discord.CacheType>,
) {
	return interaction.reply({
		ephemeral: true,
		embeds: [
			{
				title: '💁 Bot Help',
				color: colors.base0E,
				description: `Here's some handy things you can do with the bot:`,
				fields: [
					...Object.entries(commands).map(([commandName, fn]) => ({
						name: `/${commandName}`,
						value: fn.description,
					})),
					{
						name: 'Bot Reaction emoji',
						value: `We have a handful of \`:bot\`-prefixed emoji which you can use to do various things. Reply to any message with \`:bothelp:\` and I'll tell you more`,
					},
				],
			},
		],
	})
}
help.description = 'Get help on how to use the bot'

export function setup(client: Discord.Client) {
	client.on('interactionCreate', async interaction => {
		if (!interaction.isCommand()) return

		const { commandName } = interaction

		const command = commands[commandName]
		if (!command) {
			console.error(`Unknown command: ${commandName}`)
			return
		}
		await command(interaction)
	})
}
