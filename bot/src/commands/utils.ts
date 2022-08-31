import type * as Discord from 'discord.js'

export type CommandFn = {
	(interaction: Discord.CommandInteraction<Discord.CacheType>): Promise<unknown>
	description: string
	help?: (
		interaction: Discord.CommandInteraction<Discord.CacheType>,
	) => Promise<unknown>
}
