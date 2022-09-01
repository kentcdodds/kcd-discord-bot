import invariant from 'tiny-invariant'
import { getMember, listify } from '../utils/index'
import type { AutocompleteFn, CommandFn } from './utils'

type Result = {
	url: string
	segment:
		| 'Blog Posts'
		| 'Chats with Kent Episodes'
		| 'Talks'
		| 'Call Kent Podcast Episodes'
		| 'Workshops'
	title: string
}

const segmentEmoji: Record<Result['segment'], string> = {
	'Blog Posts': '📝',
	'Chats with Kent Episodes': '💬',
	Talks: '🗣',
	'Call Kent Podcast Episodes': '📳',
	Workshops: '🔧',
}

function isResults(maybeResults: unknown): maybeResults is Array<Result> {
	if (!Array.isArray(maybeResults)) return false
	return maybeResults.every(
		result =>
			typeof result === 'object' ||
			typeof result.url === 'string' ||
			typeof result.segment === 'string' ||
			typeof result.title === 'string',
	)
}

async function searchAPI(
	query: string,
): Promise<
	{ type: 'success'; results: Array<Result> } | { type: 'error'; error: string }
> {
	if (!query) return { type: 'success', results: [] }
	const encodedQuery = encodeURIComponent(query)
	const response = await fetch(
		`https://kentcdodds.com/resources/search?query=${encodedQuery}`,
	)
	if (!response.ok) {
		return {
			type: 'error',
			error: `Could not search for "${query}": ${response.statusText}`,
		}
	}
	const results = await response.json()
	if (typeof results.error === 'string') {
		return { type: 'error', error: results.error }
	}
	if (!isResults(results)) {
		return { type: 'error', error: 'Results from the API are not as expected' }
	}
	return { type: 'success', results }
}

export const autocompleteSearch: AutocompleteFn = async interaction => {
	const { guild } = interaction
	invariant(guild, 'guild is required')
	const input = interaction.options.getFocused(true)
	if (input.name === 'query') {
		const searchResponse = await searchAPI(input.value)
		const encodedQuery = encodeURIComponent(input.value)
		const searchPage = `https://kentcdodds.com/s/${encodedQuery}`
		if (searchResponse.type === 'error') {
			await interaction.respond([
				{ name: searchResponse.error, value: searchPage },
			])
			return
		}

		await interaction.respond(
			searchResponse.results.slice(0, 25).map(({ url, title, segment }) => {
				if (url.length > 100) {
					console.log('too long', { url })
					// this should work out in the end 🤷‍♂️
					url = title.slice(0, 100)
				}
				return {
					name: `${segmentEmoji[segment] ?? ''} ${title}`.slice(0, 100),
					value: url,
				}
			}),
		)
	}
}

function getURL(maybeUrl: string) {
	try {
		return new URL(maybeUrl)
	} catch (error) {
		// must not be a valid URL
		return null
	}
}

export const search: CommandFn = async interaction => {
	const { guild } = interaction
	invariant(guild, 'guild is required')

	const query = interaction.options.getString('query')
	invariant(query, 'query is required')

	const toUser = interaction.options.getUser('user')
	const toMember = toUser ? getMember(guild, toUser.id) : null
	const toMessage = toMember ? toMember.toString() : ''

	const url = getURL(query)
	if (url) {
		return interaction.reply(`${toMessage} ${url}`.trim())
	}

	const searchResponse = await searchAPI(query)
	if (searchResponse.type === 'error') {
		return interaction.reply({
			ephemeral: true,
			content: `Failed to search: ${searchResponse.error}`,
		})
	}

	if (searchResponse.results.length === 1 && searchResponse.results[0]) {
		const result = searchResponse.results[0]
		return interaction.reply(`${toMessage} ${result.url}`.trim())
	}

	const didYouMean = searchResponse.results.length
		? `Did you mean ${listify(
				searchResponse.results.map(r => r.title),
				{
					type: 'disjunction',
					stringify: JSON.stringify,
				},
		  )}?`
		: ''
	await interaction.reply({
		ephemeral: true,
		content: `I couldn't find a single result for: "${query}"\n\n${didYouMean}`,
	})
}
search.description = `Search Kent's content`
search.help = async function help(interaction) {
	return interaction.reply({
		ephemeral: true,
		content: `
This allows you to search Kent's content. 
		`.trim(),
	})
}
