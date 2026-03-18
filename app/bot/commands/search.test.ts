import assert from 'node:assert/strict'
import test from 'node:test'

const searchWorkerClient = require('./search-worker-client') as {
	searchAPI: typeof import('./search-worker-client').searchAPI
}
const { search } = require('./search') as typeof import('./search')

const originalSearchAPI = searchWorkerClient.searchAPI

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
		interaction: interaction as Parameters<typeof search>[0],
	}
}

test.afterEach(() => {
	searchWorkerClient.searchAPI = originalSearchAPI
})

test('search forwards raw query text to searchAPI', async () => {
	const capturedCalls: Array<{ query: string; topK: number | undefined }> = []
	searchWorkerClient.searchAPI = async (query, options) => {
		capturedCalls.push({ query, topK: options?.topK })
		return { type: 'success', results: [] }
	}

	const queries = [
		'testing library hooks',
		'react-testing-library',
		'https://kentcdodds.com/blog/testing',
	]

	for (const query of queries) {
		const { interaction } = createInteraction(query)
		await search(interaction)
	}

	assert.deepEqual(capturedCalls, [
		{ query: 'testing library hooks', topK: 20 },
		{ query: 'react-testing-library', topK: 20 },
		{ query: 'https://kentcdodds.com/blog/testing', topK: 20 },
	])
})

test('search does not use a URL fast path for query text', async () => {
	const query = 'https://kentcdodds.com/blog/testing'
	let capturedQuery: string | undefined
	searchWorkerClient.searchAPI = async receivedQuery => {
		capturedQuery = receivedQuery
		return { type: 'success', results: [] }
	}

	const { interaction, replies } = createInteraction(query)
	await search(interaction)

	assert.equal(capturedQuery, query)
	assert.deepEqual(replies, [
		{
			ephemeral: true,
			content: `I couldn't find any results for: "${query}"`,
		},
	])
})
