// Command purpose:
// this command is just to make sure the bot is running
import type * as Discord from 'discord.js'
import { matchSorter } from 'match-sorter'
import * as Sentry from '@sentry/node'
import { listify, getMember, getErrorMessage, botLog, colors } from '../utils'
import type { CommandFn } from './utils'
import invariant from 'tiny-invariant'

type KifData = {
	aliases?: Array<string>
	emojiAliases?: Array<string>
	gif: string
}
const kifCache: {
	initialized: boolean
	kifs: Record<string, KifData>
	kifMap: Record<string, string>
	kifKeysWithoutEmoji: Array<string>
} = {
	initialized: false,
	kifs: {},
	kifMap: {},
	kifKeysWithoutEmoji: [],
}

type KifsRawData = { content: string; encoding: 'utf8' }

async function getKifInfo(guild: Discord.Guild, { force = false } = {}) {
	if (kifCache.initialized && !force) return kifCache
	const { default: got } = await import('got')

	const kifs = (await got(
		'https://api.github.com/repos/kentcdodds/kifs/contents/kifs.json',
	)
		.json()
		.then(
			data => {
				const kifsData = data as KifsRawData
				return JSON.parse(
					Buffer.from(kifsData.content, kifsData.encoding).toString(),
				)
			},
			(e: unknown) => {
				const errorMessage = getErrorMessage(e)
				Sentry.captureMessage(
					`There was a problem getting kifs info from GitHub: ${errorMessage}`,
				)
				if (guild) {
					void botLog(guild, () => {
						return {
							title: '❌ Kif failure',
							color: colors.base08,
							description: `Trouble getting kifs from GitHub`,
							fields: [{ name: 'Error Message', value: errorMessage }],
						}
					})
				}
				return {}
			},
		)) as Record<string, KifData>
	const kifKeysWithoutEmoji = []
	const kifMap: typeof kifCache['kifMap'] = {}
	for (const kifKey of Object.keys(kifs)) {
		const { gif, aliases = [], emojiAliases = [] } = kifs[kifKey] ?? {}
		if (!gif) continue

		kifMap[kifKey.toLowerCase()] = gif
		kifKeysWithoutEmoji.push(kifKey, ...aliases)
		for (const alias of [...aliases, ...emojiAliases]) {
			if (kifMap[alias]) {
				Sentry.captureMessage(
					`Cannot have two kifs with the same alias: ${alias}`,
				)
				if (guild) {
					void botLog(guild, () => {
						return {
							title: '❌ Kif failure',
							color: colors.base08,
							description: `Two kifs have the same alias!`,
							url: 'https://github.com/kentcdodds/kifs/edit/main/kifs.json',
							fields: [
								{ name: 'Duplicate alias', value: alias, inline: true },
								{ name: 'First kif', value: kifMap[alias] },
								{ name: 'Second kif', value: gif },
							],
						}
					})
				}
			}
			kifMap[alias] = gif
		}
	}
	kifKeysWithoutEmoji.sort()

	Object.assign(kifCache, {
		initialized: true,
		kifs,
		kifMap,
		kifKeysWithoutEmoji,
	})
	return kifCache
}

async function getCloseMatches(guild: Discord.Guild, search: string) {
	const { kifKeysWithoutEmoji } = await getKifInfo(guild)
	const { default: leven } = await import('leven')
	return Array.from(
		new Set([
			// levenshtein distance matters most, but we want it sorted
			...matchSorter(
				kifKeysWithoutEmoji.filter(k => leven(k, search) < 2),
				search,
				// sometimes match sorter doesn't consider things to match
				// but the levenshtein distance is close, so we'll allow NO_MATCH here
				{ threshold: matchSorter.rankings.NO_MATCH },
			),
			// let's add whatever else isn't close in levenshtein distance, but
			// does still match with match sorter.
			...matchSorter(kifKeysWithoutEmoji, search),
		]),
	).slice(0, 6)
}

const handleKifCommand: CommandFn = async interaction => {
	const { guild } = interaction
	invariant(guild, 'name is required')

	const name = interaction.options.getString('name')
	invariant(name, 'name is required')

	const toUser = interaction.options.getUser('user')
	const toMember = toUser ? getMember(guild, toUser.id) : null
	const toMessage = toMember ? toMember.toString() : ''

	let cache = await getKifInfo(guild)
	if (!cache.kifMap[name]) {
		cache = await getKifInfo(guild, { force: true })
	}

	const kif = cache.kifMap[name]
	if (kif) {
		return interaction.reply(`${toMessage}\n${kif}`.trim())
	}

	const closeMatches = await getCloseMatches(guild, name)
	if (closeMatches.length === 1 && closeMatches[0]) {
		const closestMatch = closeMatches[0]
		const matchingKif = cache.kifMap[closestMatch]
		if (matchingKif) {
			return interaction.reply(
				`Did you mean "${closestMatch}"?\n${toMessage}\n${kif}`,
			)
		}
	}
	const didYouMean = closeMatches.length
		? `Did you mean ${listify(closeMatches, {
				type: 'disjunction',
				stringify: JSON.stringify,
		  })}?`
		: ''
	await interaction.reply({
		ephemeral: true,
		content: `Couldn't find a kif for: "${name}"\n\n${didYouMean}`,
	})
}

handleKifCommand.description = `Send a KCD gif (send \`?help kif\` for more info)`
handleKifCommand.help = async function help(interaction) {
	return interaction.reply({
		ephemeral: true,
		content: `
"kifs" are "Kent C. Dodds Gifs" and you can find a full list of available kifs here: <https://kcd.im/kifs>

\`?kif amazed\` - Sends the "amazed" kif
\`?kif 👊 @kentcdodds\` - Sends the "fist bump" kif to \`@kentcdodds\`
		`.trim(),
	})
}

export { handleKifCommand as kif }
