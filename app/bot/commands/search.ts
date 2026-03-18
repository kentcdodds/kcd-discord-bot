import { invariant } from '~/utils'
import { getMember } from '../utils/index'
import { normalizeSearchCommandQuery } from './search-query-normalizer'
import { searchAPI } from './search-worker-client'
import type { AutocompleteFn, CommandFn } from './utils'

const segmentEmoji: Record<string, string> = {
	// Search worker "type" categories returned by kentcdodds.com.
	blog: '📝',
	page: '📄',
	'jsx-page': '📄',
	youtube: '📺',
	cwk: '💬',
	ck: '📳',
	talk: '🗣',
	resume: '📄',
	credit: '🙏',
	testimonial: '💬',
}

function getSegmentEmoji(segment: string) {
	const normalized = segment.trim().toLowerCase()
	return segmentEmoji[normalized] ?? '🔎'
}

const discordEmbedLimits = {
	// Total chars across embed text fields (title/description/field names/values/etc.)
	total: 6000,
	title: 256,
	description: 4096,
	fieldName: 256,
	fieldValue: 1024,
} as const

const searchResultLimit = 20 as const

function truncate(text: string, maxLength: number) {
	if (text.length <= maxLength) return text
	if (maxLength <= 3) return text.slice(0, maxLength)
	return `${text.slice(0, maxLength - 3).trimEnd()}...`
}

function collapseWhitespace(text: string) {
	return text.replace(/\s+/g, ' ').trim()
}

function getSafeHttpUrl(maybeUrl: string | undefined) {
	if (!maybeUrl) return undefined
	const url = getURL(maybeUrl)
	if (!url) return undefined
	if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined
	return url.toString()
}

export const autocompleteSearch: AutocompleteFn = async interaction => {
	const { guild } = interaction
	invariant(guild, 'guild is required')
	const input = interaction.options.getFocused(true)
	if (input.name === 'query') {
		const searchResponse = await searchAPI(input.value, {
			topK: searchResultLimit,
		})
		const encodedQuery = encodeURIComponent(input.value)
		const searchPage = `https://kentcdodds.com/s/${encodedQuery}`
		if (searchResponse.type === 'error') {
			await interaction.respond([
				{ name: searchResponse.error, value: searchPage },
			])
			return
		}

		await interaction.respond(
			searchResponse.results.slice(0, searchResultLimit).map(result => {
				let { url } = result
				const { title, segment } = result
				const summary = result.summary ? collapseWhitespace(result.summary) : ''
				if (url.length > 100) {
					console.log('too long', { url })
					// Try to shrink the URL by stripping search/hash. If it's still too
					// long, fall back to a short query-ish value (this will still search).
					const parsedUrl = getURL(url)
					if (parsedUrl) {
						parsedUrl.search = ''
						parsedUrl.hash = ''
						const shrunk = parsedUrl.toString()
						if (shrunk.length <= 100) url = shrunk
					}
					if (url.length > 100) url = title.slice(0, 100)
				}
				const emoji = getSegmentEmoji(segment)
				const baseName = `${emoji} ${title}`.trim()
				const withSummary =
					summary && baseName.length + 3 < 100
						? `${baseName} - ${truncate(summary, 100 - baseName.length - 3)}`
						: baseName
				return {
					name: truncate(withSummary, 100),
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

	const rawQuery = interaction.options.get('query')?.value
	invariant(typeof rawQuery === 'string', 'query must be a string')

	const toUser = interaction.options.getUser('user')
	const toMember = toUser ? getMember(guild, toUser.id) : null
	const toMessage = toMember ? toMember.toString() : ''

	const normalizedQuery = normalizeSearchCommandQuery(rawQuery)
	if (normalizedQuery.type === 'url') {
		return interaction.reply(`${toMessage} ${normalizedQuery.value}`.trim())
	}

	const query = normalizedQuery.value
	const searchResponse = await searchAPI(query, { topK: searchResultLimit })
	if (searchResponse.type === 'error') {
		return interaction.reply({
			ephemeral: true,
			content: `Failed to search: ${searchResponse.error}`,
		})
	}

	const results = searchResponse.results
	if (results.length === 1 && results[0]) {
		const result = results[0]
		const safeThumbnailUrl = getSafeHttpUrl(result.imageUrl)
		const summary = result.summary ? collapseWhitespace(result.summary) : ''
		const embed: {
			title: string
			url: string
			description?: string
			thumbnail?: { url: string }
		} = {
			title: truncate(result.title, discordEmbedLimits.title),
			url: result.url,
		}
		if (summary) {
			embed.description = truncate(summary, discordEmbedLimits.description)
		}
		if (safeThumbnailUrl) {
			embed.thumbnail = { url: safeThumbnailUrl }
		}
		return interaction.reply({
			content: toMessage || undefined,
			embeds: [embed],
		})
	}

	if (results.length > 1) {
		const encodedQuery = encodeURIComponent(query)
		const searchPage = `https://kentcdodds.com/s/${encodedQuery}`
		const topResults = results.slice(0, 5)
		const safeThumbnailUrl = getSafeHttpUrl(topResults[0]?.imageUrl)

		const normalizedQuery = truncate(
			collapseWhitespace(query),
			discordEmbedLimits.title - 'Search results for ""'.length,
		)
		const embedTitle = truncate(
			`Search results for "${normalizedQuery}"`,
			discordEmbedLimits.title,
		)

		// Discord enforces a 6000-character limit across all embed text fields.
		// Build fields with a running budget to prevent API 400s in edge cases
		// (e.g. very long URLs/titles).
		let usedChars = embedTitle.length
		const fields: Array<{ name: string; value: string }> = []
		for (const result of topResults) {
			const emoji = getSegmentEmoji(result.segment)
			const name = truncate(
				`${emoji} ${result.title}`.trim(),
				discordEmbedLimits.fieldName,
			)

			// Remaining embed budget for this field's value after accounting for name.
			const remainingForValue =
				discordEmbedLimits.total - usedChars - name.length
			if (remainingForValue <= 0) break
			const maxValueLength = Math.min(
				discordEmbedLimits.fieldValue,
				remainingForValue,
			)

			const urlLine = result.url
			const summary = result.summary ? collapseWhitespace(result.summary) : ''

			let value = ''
			if (!summary) {
				value = truncate(urlLine, maxValueLength)
			} else if (urlLine.length + 1 >= maxValueLength) {
				// Not enough room for "summary\nurl", prioritize URL.
				value = truncate(urlLine, maxValueLength)
			} else {
				// Keep URL intact when possible by truncating summary first.
				const summaryLimit = Math.min(300, maxValueLength - urlLine.length - 1)
				const truncatedSummary = truncate(summary, summaryLimit)
				value = `${truncatedSummary}\n${urlLine}`
			}

			// Discord requires non-empty field values.
			if (!value) continue

			fields.push({ name, value })
			usedChars += name.length + value.length

			// Top 3–5 results requirement: we try up to 5; stop early if we're out of budget.
			if (usedChars >= discordEmbedLimits.total) break
		}

		const embed: {
			title: string
			url: string
			fields: Array<{ name: string; value: string }>
			thumbnail?: { url: string }
		} = {
			title: embedTitle,
			url: searchPage,
			fields,
		}
		if (safeThumbnailUrl) {
			embed.thumbnail = { url: safeThumbnailUrl }
		}

		return interaction.reply({
			content: toMessage || undefined,
			embeds: [embed],
		})
	}

	await interaction.reply({
		ephemeral: true,
		content: `I couldn't find any results for: "${query}"`,
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
