import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeSearchCommandQuery } from './search-query-normalizer'

test('normalizeSearchCommandQuery preserves free-typed queries', () => {
	assert.deepEqual(normalizeSearchCommandQuery('react testing library'), {
		type: 'search',
		value: 'react testing library',
	})
})

test('normalizeSearchCommandQuery preserves direct URLs', () => {
	assert.deepEqual(
		normalizeSearchCommandQuery(
			'https://kentcdodds.com/blog/testing-implementation-details',
		),
		{
			type: 'url',
			value: 'https://kentcdodds.com/blog/testing-implementation-details',
		},
	)
})

test('normalizeSearchCommandQuery strips autocomplete labels down to the title', () => {
	assert.deepEqual(
		normalizeSearchCommandQuery(
			'📳 Question about testing alongside RTL - Title: Question about testing alongside RTL Type: ck UR...',
		),
		{
			type: 'search',
			value: 'Question about testing alongside RTL',
		},
	)
})

test('normalizeSearchCommandQuery extracts embedded URLs from autocomplete labels', () => {
	assert.deepEqual(
		normalizeSearchCommandQuery(
			'📺 Testing implementation details - Watch this: https://kentcdodds.com/youtube/testing-implementation-details',
		),
		{
			type: 'url',
			value: 'https://kentcdodds.com/youtube/testing-implementation-details',
		},
	)
})

test('normalizeSearchCommandQuery uses metadata titles when only metadata is provided', () => {
	assert.deepEqual(
		normalizeSearchCommandQuery(
			'Title: Question about testing alongside RTL Type: ck',
		),
		{
			type: 'search',
			value: 'Question about testing alongside RTL',
		},
	)
})
