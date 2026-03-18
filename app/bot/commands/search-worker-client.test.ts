import assert from 'node:assert/strict'
import test from 'node:test'

import { searchAPI } from './search-worker-client'

const originalFetch = global.fetch
const originalSearchWorkerUrl = process.env.SEARCH_WORKER_URL
const originalSearchWorkerToken = process.env.SEARCH_WORKER_TOKEN

function restoreSearchWorkerEnv() {
	const mutableEnv = process.env as Record<string, string | undefined>

	if (originalSearchWorkerUrl == null) {
		delete mutableEnv.SEARCH_WORKER_URL
	} else {
		process.env.SEARCH_WORKER_URL = originalSearchWorkerUrl
	}

	if (originalSearchWorkerToken == null) {
		delete mutableEnv.SEARCH_WORKER_TOKEN
	} else {
		process.env.SEARCH_WORKER_TOKEN = originalSearchWorkerToken
	}
}

function setSearchWorkerEnv() {
	process.env.SEARCH_WORKER_URL = 'https://search.example.workers.dev'
	process.env.SEARCH_WORKER_TOKEN = 'test-worker-token'
}

test.afterEach(() => {
	global.fetch = originalFetch
	restoreSearchWorkerEnv()
})

test('searchAPI sends authenticated POST requests and normalizes results', async () => {
	setSearchWorkerEnv()

	let capturedInput: RequestInfo | URL | undefined
	let capturedInit: RequestInit | undefined
	global.fetch = (async (input, init) => {
		capturedInput = input
		capturedInit = init

		return new Response(
			JSON.stringify({
				ok: true,
				results: [
					{
						id: 'post-123',
						score: 0.99,
						type: 'blog',
						title: 'Testing Kent content',
						url: 'https://kentcdodds.com/blog/testing-kent-content',
						snippet: 'A concise snippet from the worker',
						imageUrl: 'https://kentcdodds.com/images/testing.png',
						imageAlt: 'Testing image',
					},
				],
			}),
			{ status: 200, headers: { 'Content-Type': 'application/json' } },
		)
	}) as typeof fetch

	const response = await searchAPI('testing library', { topK: 7 })

	assert.deepEqual(response, {
		type: 'success',
		noCloseMatches: false,
		results: [
			{
				segment: 'blog',
				title: 'Testing Kent content',
				url: 'https://kentcdodds.com/blog/testing-kent-content',
				summary: 'A concise snippet from the worker',
				imageUrl: 'https://kentcdodds.com/images/testing.png',
				imageAlt: 'Testing image',
			},
		],
	})
	assert.equal(
		capturedInput instanceof URL
			? capturedInput.toString()
			: String(capturedInput),
		'https://search.example.workers.dev/search',
	)
	assert.equal(capturedInit?.method, 'POST')
	assert.equal(
		capturedInit?.body,
		JSON.stringify({ query: 'testing library', topK: 7 }),
	)

	const headers = new Headers(capturedInit?.headers)
	assert.equal(headers.get('authorization'), 'Bearer test-worker-token')
	assert.equal(headers.get('content-type'), 'application/json')
})

test('searchAPI expands pathname results into full Kent URLs', async () => {
	setSearchWorkerEnv()

	global.fetch = (async () =>
		new Response(
			JSON.stringify({
				ok: true,
				results: [
					{
						type: 'blog',
						title: 'Relative search result',
						url: '/blog/relative-search-result',
						snippet: 'Returned by the worker as a pathname.',
					},
					{
						type: 'page',
						title: 'Pathname-only search result',
						pathname: '/about',
						snippet: 'Returned by the worker without a full URL.',
					},
				],
			}),
			{ status: 200, headers: { 'Content-Type': 'application/json' } },
		)) as typeof fetch

	const response = await searchAPI('relative links')

	assert.deepEqual(response, {
		type: 'success',
		noCloseMatches: false,
		results: [
			{
				segment: 'blog',
				title: 'Relative search result',
				url: 'https://kentcdodds.com/blog/relative-search-result',
				summary: 'Returned by the worker as a pathname.',
				imageUrl: undefined,
				imageAlt: undefined,
			},
			{
				segment: 'page',
				title: 'Pathname-only search result',
				url: 'https://kentcdodds.com/about',
				summary: 'Returned by the worker without a full URL.',
				imageUrl: undefined,
				imageAlt: undefined,
			},
		],
	})
})

test('searchAPI sets noCloseMatches and ignores lowRankingResults for results list', async () => {
	setSearchWorkerEnv()

	global.fetch = (async () =>
		new Response(
			JSON.stringify({
				ok: true,
				results: [],
				noCloseMatches: true,
				lowRankingResults: [
					{
						type: 'blog',
						title: 'Weak hit',
						url: 'https://kentcdodds.com/blog/weak',
						snippet: 'Should not appear in results.',
					},
				],
			}),
			{ status: 200, headers: { 'Content-Type': 'application/json' } },
		)) as typeof fetch

	const response = await searchAPI('vague')

	assert.deepEqual(response, {
		type: 'success',
		noCloseMatches: true,
		results: [],
	})
})

test('searchAPI returns worker JSON errors', async () => {
	setSearchWorkerEnv()

	global.fetch = (async () =>
		new Response(JSON.stringify({ ok: false, error: 'Query rejected' }), {
			status: 400,
			statusText: 'Bad Request',
			headers: { 'Content-Type': 'application/json' },
		})) as typeof fetch

	const response = await searchAPI('too broad')

	assert.deepEqual(response, {
		type: 'error',
		error: 'Query rejected',
	})
})

test('searchAPI aborts requests after the configured timeout', async () => {
	setSearchWorkerEnv()

	global.fetch = ((input, init) =>
		new Promise((resolve, reject) => {
			void input
			void resolve

			const signal = init?.signal
			assert.ok(signal instanceof AbortSignal)
			signal.addEventListener('abort', () => {
				reject(
					Object.assign(new Error('The operation was aborted.'), {
						name: 'AbortError',
					}),
				)
			})
		})) as typeof fetch

	const response = await searchAPI('slow query', { timeoutMs: 1 })

	assert.deepEqual(response, {
		type: 'error',
		error: 'Search request timed out after 1ms.',
	})
})

test('searchAPI rejects queries longer than the worker limit without fetching', async () => {
	setSearchWorkerEnv()

	let fetchCallCount = 0
	global.fetch = (async () => {
		fetchCallCount += 1
		return new Response(null, { status: 200 })
	}) as typeof fetch

	const response = await searchAPI('a'.repeat(1001))

	assert.deepEqual(response, {
		type: 'error',
		error: 'Search query must be 1000 characters or fewer.',
	})
	assert.equal(fetchCallCount, 0)
})
