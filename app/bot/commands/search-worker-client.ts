import { invariant } from '../../utils'

export type SearchResult = {
	url: string
	segment: string
	title: string
	summary?: string
	imageUrl?: string
	imageAlt?: string
}

type SearchWorkerResult = Record<string, unknown>

type SearchWorkerSuccessResponse = {
	ok: true
	results: Array<SearchWorkerResult>
}

type SearchWorkerErrorResponse = {
	ok: false
	error: string
}

const kcdContentOrigin = 'https://kentcdodds.com'
const defaultTopK = 20
const maxTopK = 20
const minTopK = 1
const defaultTimeoutMs = 10_000
const maxQueryLength = 1000

function isSearchWorkerSuccessResponse(
	maybeResponse: unknown,
): maybeResponse is SearchWorkerSuccessResponse {
	if (!maybeResponse || typeof maybeResponse !== 'object') return false
	const response = maybeResponse as Record<string, unknown>
	return response.ok === true && Array.isArray(response.results)
}

function isSearchWorkerErrorResponse(
	maybeResponse: unknown,
): maybeResponse is SearchWorkerErrorResponse {
	if (!maybeResponse || typeof maybeResponse !== 'object') return false
	const response = maybeResponse as Record<string, unknown>
	return response.ok === false && typeof response.error === 'string'
}

function getOptionalString(
	record: Record<string, unknown>,
	key: string,
): string | undefined {
	const value = record[key]
	return typeof value === 'string' && value.trim() ? value : undefined
}

function normalizeSearchResultUrl(record: SearchWorkerResult) {
	const rawUrl =
		getOptionalString(record, 'url') ?? getOptionalString(record, 'pathname')
	if (!rawUrl) return null

	try {
		if (rawUrl.startsWith('//')) return null
		const url = rawUrl.startsWith('/')
			? new URL(rawUrl, kcdContentOrigin)
			: new URL(rawUrl)
		if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
		return url.toString()
	} catch {
		return null
	}
}

function normalizeSearchWorkerResult(
	maybeResult: SearchWorkerResult,
): SearchResult | null {
	const url = normalizeSearchResultUrl(maybeResult)
	const title = getOptionalString(maybeResult, 'title')
	if (!url || !title) return null

	return {
		url,
		title,
		segment: getOptionalString(maybeResult, 'type') ?? 'result',
		summary:
			getOptionalString(maybeResult, 'summary') ??
			getOptionalString(maybeResult, 'snippet'),
		imageUrl: getOptionalString(maybeResult, 'imageUrl'),
		imageAlt: getOptionalString(maybeResult, 'imageAlt'),
	}
}

async function parseResponseBody(response: Response) {
	try {
		return await response.json()
	} catch {
		return null
	}
}

function formatTimeoutError(timeoutMs: number) {
	if (timeoutMs % 1000 === 0) {
		return `Search request timed out after ${timeoutMs / 1000} seconds.`
	}

	return `Search request timed out after ${timeoutMs}ms.`
}

function isAbortError(error: unknown) {
	return error instanceof Error && error.name === 'AbortError'
}

function createTimeoutSignal(timeoutMs: number) {
	const controller = new AbortController()
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

	return {
		signal: controller.signal,
		cancel() {
			clearTimeout(timeoutId)
		},
	}
}

export async function searchAPI(
	query: string,
	options?: { topK?: number; timeoutMs?: number },
): Promise<
	| { type: 'success'; results: Array<SearchResult> }
	| { type: 'error'; error: string }
> {
	if (!query) return { type: 'success', results: [] }
	if (query.length > maxQueryLength) {
		return {
			type: 'error',
			error: `Search query must be ${maxQueryLength} characters or fewer.`,
		}
	}

	const timeoutMs = options?.timeoutMs ?? defaultTimeoutMs
	const topK = Math.max(
		minTopK,
		Math.min(maxTopK, Math.trunc(options?.topK ?? defaultTopK)),
	)

	try {
		invariant(process.env.SEARCH_WORKER_URL, 'SEARCH_WORKER_URL is required')
		invariant(
			process.env.SEARCH_WORKER_TOKEN,
			'SEARCH_WORKER_TOKEN is required',
		)
		const timeoutSignal = createTimeoutSignal(timeoutMs)

		try {
			const response = await fetch(
				new URL('/search', process.env.SEARCH_WORKER_URL),
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${process.env.SEARCH_WORKER_TOKEN}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ query, topK }),
					signal: timeoutSignal.signal,
				},
			)

			const body = await parseResponseBody(response)

			if (!response.ok) {
				if (isSearchWorkerErrorResponse(body)) {
					return { type: 'error', error: body.error }
				}

				return {
					type: 'error',
					error:
						`Could not search for "${query}": ${response.status} ${response.statusText}`.trim(),
				}
			}

			if (!isSearchWorkerSuccessResponse(body)) {
				return {
					type: 'error',
					error: 'Results from the API are not as expected',
				}
			}

			return {
				type: 'success',
				results: body.results
					.map(result => normalizeSearchWorkerResult(result))
					.filter((result): result is SearchResult => result != null),
			}
		} finally {
			timeoutSignal.cancel()
		}
	} catch (error) {
		if (isAbortError(error)) {
			return { type: 'error', error: formatTimeoutError(timeoutMs) }
		}

		return {
			type: 'error',
			error:
				error instanceof Error
					? `Could not search for "${query}": ${error.message}`
					: `Could not search for "${query}"`,
		}
	}
}
