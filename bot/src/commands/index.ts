import * as Discord from 'discord.js'
import type { CommandFn, AutocompleteFn } from './utils'
import { info } from './info'
import { kif, autocompleteKif } from './kif'
import { search, autocompleteSearch } from './search'

const commands: Record<string, CommandFn> = {
	info,
	help,
	kif,
	search,
} as const
const autocompletes: Record<string, AutocompleteFn> = {
	kif: autocompleteKif,
	search: autocompleteSearch,
}

async function help(
	interaction: Discord.CommandInteraction<Discord.CacheType>,
) {
	return interaction.reply({
		ephemeral: true,
		embeds: [
			{
				title: '💁 Bot Help',
				color: Discord.Colors.Purple,
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
		if (interaction.isCommand()) {
			const { commandName } = interaction

			const command = commands[commandName]
			if (!command) {
				console.error(`Unknown command: ${commandName}`)
				return
			}
			await command(interaction)
		} else if (interaction.isAutocomplete()) {
			const { commandName } = interaction

			const autocomplete = autocompletes[commandName]
			if (!autocomplete) {
				console.error(`Unknown autocomplete: ${commandName}`)
				return
			}
			await autocomplete(interaction)
		}
	})
}
