import assert from 'node:assert/strict'
import test from 'node:test'

import { autocompleteSearch, search } from './search'

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

function createInteraction(query: string, userId = 'user-1') {
	const replies: Array<unknown> = []
	const interaction = {
		guild: {},
		user: { id: userId },
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

function createAutocompleteInteraction(query: string, userId = 'user-1') {
	const responses: Array<unknown> = []
	const interaction = {
		guild: {},
		user: { id: userId },
		options: {
			getFocused(required: true) {
				void required
				return { name: 'query', value: query }
			},
		},
		async respond(payload: unknown) {
			responses.push(payload)
			return payload
		},
	}

	return {
		responses,
		interaction: interaction as unknown as Parameters<typeof autocompleteSearch>[0],
	}
}

test.afterEach(() => {
	global.fetch = originalFetch
	restoreSearchWorkerEnv()
})

test('search autocomplete returns per-result selection tokens', async () => {
	setSearchWorkerEnv()
	const query = 'react-testing-library'
	const capturedBodies: Array<{ query: string; topK: number }> = []
	global.fetch = (async (_input, init) => {
		capturedBodies.push(parseSearchRequestBody(init))
		return new Response(
			JSON.stringify({
				ok: true,
				results: [
					{
						type: 'blog',
						title: 'React Testing Library Setup',
						url: 'https://kentcdodds.com/blog/react-testing-library-setup',
						snippet: 'Learn the setup.',
					},
					{
						type: 'youtube',
						title: 'React Testing Library Video',
						url: 'https://kentcdodds.com/calls/03/12/react-testing-library',
						snippet: 'Watch the walkthrough.',
					},
				],
			}),
			{ status: 200, headers: { 'Content-Type': 'application/json' } },
		)
	}) as typeof fetch

	const { interaction, responses } = createAutocompleteInteraction(query)
	await autocompleteSearch(interaction)

	assert.deepEqual(capturedBodies, [{ query, topK: 20 }])
	assert.equal(responses.length, 1)
	const [choices] = responses as [
		Array<{ name: string; value: string }>,
	]
	assert.deepEqual(
		choices.map(choice => choice.name),
		[
			'📝 React Testing Library Setup - Learn the setup.',
			'📺 React Testing Library Video - Watch the walkthrough.',
		],
	)
	assert.equal(choices.length, 2)
	assert.match(choices[0]!.value, /^search-selection:user-1:/)
	assert.match(choices[1]!.value, /^search-selection:user-1:/)
	assert.notEqual(choices[0]!.value, choices[1]!.value)
})

test('search returns the selected autocomplete result URL without rerunning search', async () => {
	setSearchWorkerEnv()
	let fetchCallCount = 0
	global.fetch = (async (_input, init) => {
		fetchCallCount += 1
		assert.deepEqual(parseSearchRequestBody(init), {
			query: 'react-testing-library',
			topK: 20,
		})
		return new Response(
			JSON.stringify({
				ok: true,
				results: [
					{
						type: 'blog',
						title: 'React Testing Library Setup',
						url: 'https://kentcdodds.com/blog/react-testing-library-setup',
						snippet: 'Learn the setup.',
					},
				],
			}),
			{ status: 200, headers: { 'Content-Type': 'application/json' } },
		)
	}) as typeof fetch

	const autocomplete = createAutocompleteInteraction('react-testing-library')
	await autocompleteSearch(autocomplete.interaction)

	const selectionToken = (
		autocomplete.responses[0] as Array<{ name: string; value: string }>
	)[0]!.value
	const { interaction, replies } = createInteraction(selectionToken)
	await search(interaction)

	assert.equal(fetchCallCount, 1)
	assert.deepEqual(replies, [
		{
			content: 'https://kentcdodds.com/blog/react-testing-library-setup',
		},
	])
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
