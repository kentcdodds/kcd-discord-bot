export type SearchCommandQuery =
	| { type: 'url'; value: string }
	| { type: 'search'; value: string }

const autocompleteSummaryDelimiter = ' - '
const embeddedUrlPattern = /https?:\/\/\S+/iu
const leadingEmojiPattern = /^\p{Extended_Pictographic}\uFE0F?\s+/u
const metadataTitlePattern = /^Title:\s*(.+?)(?=\s+(?:Type|URL):|$)/iu

function collapseWhitespace(text: string) {
	return text.replace(/\s+/g, ' ').trim()
}

function getWebUrl(maybeUrl: string) {
	if (/\s/.test(maybeUrl)) return null

	try {
		const url = new URL(maybeUrl)
		if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
		return url
	} catch (error) {
		// must not be a valid URL
		return null
	}
}

function getEmbeddedUrl(text: string) {
	const match = text.match(embeddedUrlPattern)
	if (!match) return null

	const embeddedUrl = getWebUrl(match[0])
	return embeddedUrl ? embeddedUrl.toString() : null
}

export function normalizeSearchCommandQuery(
	rawQuery: string,
): SearchCommandQuery {
	const trimmedQuery = collapseWhitespace(rawQuery)
	const directUrl = getWebUrl(trimmedQuery)
	if (directUrl) {
		return { type: 'url', value: directUrl.toString() }
	}

	const embeddedUrl = getEmbeddedUrl(trimmedQuery)
	if (embeddedUrl) {
		return { type: 'url', value: embeddedUrl }
	}

	let normalizedQuery = trimmedQuery.replace(leadingEmojiPattern, '')
	if (normalizedQuery.includes(autocompleteSummaryDelimiter)) {
		normalizedQuery =
			normalizedQuery.split(autocompleteSummaryDelimiter, 1)[0] ??
			normalizedQuery
	} else {
		const titleMatch = normalizedQuery.match(metadataTitlePattern)
		if (titleMatch?.[1]) normalizedQuery = titleMatch[1]
	}

	normalizedQuery = collapseWhitespace(normalizedQuery)
	if (!normalizedQuery) normalizedQuery = trimmedQuery

	return { type: 'search', value: normalizedQuery }
}
