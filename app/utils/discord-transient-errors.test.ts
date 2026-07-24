import assert from 'node:assert/strict'
import test from 'node:test'

import {
	isTransientDiscordError,
	isTransientDiscordGatewayError,
	isTransientDiscordHttpError,
	shouldDropTransientDiscordSentryEvent,
} from './discord-transient-errors'

test('isTransientDiscordHttpError matches Discord.js HTTPError 503', () => {
	assert.equal(
		isTransientDiscordHttpError({
			name: 'HTTPError',
			message: 'Service Unavailable',
			status: 503,
		}),
		true,
	)
	assert.equal(
		isTransientDiscordHttpError({
			name: 'HTTPError',
			message: 'Bad Gateway',
			status: 502,
		}),
		true,
	)
	assert.equal(
		isTransientDiscordHttpError({
			name: 'HTTPError',
			message: 'Not Found',
			status: 404,
		}),
		false,
	)
	assert.equal(
		isTransientDiscordHttpError(new Error('Service Unavailable')),
		false,
	)
})

test('isTransientDiscordGatewayError matches reconnect handshake noise', () => {
	assert.equal(
		isTransientDiscordGatewayError(
			new Error('Opening handshake has timed out'),
		),
		true,
	)
	assert.equal(
		isTransientDiscordGatewayError(
			new Error('Unexpected server response: 503'),
		),
		true,
	)
	assert.equal(
		isTransientDiscordGatewayError(
			new Error('Unexpected server response: 502'),
		),
		true,
	)
	assert.equal(
		isTransientDiscordGatewayError(
			new Error('Unexpected server response: 401'),
		),
		false,
	)
	assert.equal(
		isTransientDiscordGatewayError(new Error('Authentication failed')),
		false,
	)
})

test('shouldDropTransientDiscordSentryEvent uses originalException first', () => {
	assert.equal(
		shouldDropTransientDiscordSentryEvent(
			{},
			{
				originalException: {
					name: 'HTTPError',
					message: 'Service Unavailable',
					status: 503,
				},
			},
		),
		true,
	)
	assert.equal(
		shouldDropTransientDiscordSentryEvent(
			{},
			{ originalException: new Error('boom') },
		),
		false,
	)
})

test('shouldDropTransientDiscordSentryEvent falls back to exception values', () => {
	assert.equal(
		shouldDropTransientDiscordSentryEvent({
			exception: {
				values: [
					{ type: 'HTTPError', value: 'Service Unavailable' },
					{ type: 'Error', value: 'Opening handshake has timed out' },
				],
			},
		}),
		true,
	)
	assert.equal(
		shouldDropTransientDiscordSentryEvent({
			exception: {
				values: [{ type: 'TypeError', value: 'Cannot read properties' }],
			},
		}),
		false,
	)
	assert.equal(isTransientDiscordError(new Error('unrelated')), false)
})
