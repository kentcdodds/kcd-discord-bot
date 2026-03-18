import assert from 'node:assert/strict'
import test from 'node:test'

import { search } from './search'

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

function parseSearchRequestBody(init: RequestInit | undefined) {
	return JSON.parse(String(init?.body)) as { query: string; topK: number }
}

function createInteraction(query: string) {
	const replies: Array<unknown> = []
	const interaction = {
		guild: {},
		options: {
			get(name: string) {
				if (name === 'query') return { value: query }
				return null
			},
			getUser() {
				return null
			},
		},
		async reply(payload: unknown) {
			replies.push(payload)
			return payload
		},
	}

	return {
		replies,
		interaction: interaction as unknown as Parameters<typeof search>[0],
	}
}

test.afterEach(() => {
	global.fetch = originalFetch
	restoreSearchWorkerEnv()
})

test('search forwards raw query text to searchAPI', async () => {
	setSearchWorkerEnv()
	const capturedBodies: Array<{ query: string; topK: number }> = []
	global.fetch = (async (_input, init) => {
		capturedBodies.push(parseSearchRequestBody(init))
		return new Response(
			JSON.stringify({
				ok: true,
				results: [],
			}),
			{ status: 200, headers: { 'Content-Type': 'application/json' } },
		)
	}) as typeof fetch

	const queries = [
		'testing library hooks',
		'react-testing-library',
		'https://kentcdodds.com/blog/testing',
	]

	for (const query of queries) {
		const { interaction } = createInteraction(query)
		await search(interaction)
	}

	assert.deepEqual(capturedBodies, [
		{ query: 'testing library hooks', topK: 20 },
		{ query: 'react-testing-library', topK: 20 },
		{ query: 'https://kentcdodds.com/blog/testing', topK: 20 },
	])
})

test('search does not use a URL fast path for query text', async () => {
	setSearchWorkerEnv()
	const query = 'https://kentcdodds.com/blog/testing'
	let fetchCallCount = 0
	global.fetch = (async (_input, init) => {
		fetchCallCount += 1
		assert.deepEqual(parseSearchRequestBody(init), { query, topK: 20 })
		return new Response(
			JSON.stringify({
				ok: true,
				results: [],
			}),
			{ status: 200, headers: { 'Content-Type': 'application/json' } },
		)
	}) as typeof fetch

	const { interaction, replies } = createInteraction(query)
	await search(interaction)

	assert.equal(fetchCallCount, 1)
	assert.deepEqual(replies, [
		{
			ephemeral: true,
			content: `I couldn't find any results for: "${query}"`,
		},
	])
})
