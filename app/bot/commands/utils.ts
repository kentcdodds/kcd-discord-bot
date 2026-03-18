import type * as Discord from 'discord.js'

export type CommandFn = {
	(
		interaction: Discord.ChatInputCommandInteraction<Discord.CacheType>,
	): Promise<unknown>
	description: string
	help?: (
		interaction: Discord.ChatInputCommandInteraction<Discord.CacheType>,
	) => Promise<unknown>
}

export type AutocompleteFn = (
	interaction: Discord.AutocompleteInteraction<Discord.CacheType>,
) => Promise<unknown>
