import assert from 'node:assert/strict'
import test from 'node:test'

import {
	buildKodyInvocationBody,
	invokeKodyMessageCreated,
	normalizeMessageCreate,
	parseDiscordIntents,
} from './gateway-proxy'

test('normalizeMessageCreate maps Discord MESSAGE_CREATE data to Kody event shape', () => {
	const message = {
		id: 'message-123',
		channel_id: 'channel-456',
		guild_id: 'guild-789',
		content: 'hello from discord',
		timestamp: '2026-04-27T19:45:00.000Z',
		author: {
			id: 'user-123',
			username: 'kody-user',
			global_name: 'Kody User',
			bot: false,
		},
		message_reference: {
			message_id: 'parent-message-123',
		},
		extra_discord_field: true,
	}

	assert.deepEqual(normalizeMessageCreate(message), {
		type: 'message.created',
		eventId: 'gateway:message-123',
		occurredAt: '2026-04-27T19:45:00.000Z',
		guildId: 'guild-789',
		channelId: 'channel-456',
		parentChannelId: null,
		threadId: null,
		threadName: null,
		messageId: 'message-123',
		content: 'hello from discord',
		author: {
			id: 'user-123',
			username: 'kody-user',
			globalName: 'Kody User',
			bot: false,
		},
		referenceMessageId: 'parent-message-123',
		raw: message,
	})
})

test('normalizeMessageCreate fills safe defaults for sparse Discord data', () => {
	assert.deepEqual(
		normalizeMessageCreate({ id: 'message-123' }, new Date('2026-04-27T20:00:00.000Z')),
		{
			type: 'message.created',
			eventId: 'gateway:message-123',
			occurredAt: '2026-04-27T20:00:00.000Z',
			guildId: null,
			channelId: null,
			parentChannelId: null,
			threadId: null,
			threadName: null,
			messageId: 'message-123',
			content: '',
			author: {
				id: '',
				username: '',
				globalName: null,
				bot: false,
			},
			referenceMessageId: null,
			raw: { id: 'message-123' },
		},
	)
})

test('buildKodyInvocationBody uses stable idempotency key and topic envelope', () => {
	const event = normalizeMessageCreate({
		id: 'message-123',
		channel_id: 'channel-456',
	})

	assert.deepEqual(buildKodyInvocationBody(event), {
		params: { event },
		idempotencyKey: 'discord:message-create:message-123',
		source: 'discord-gateway',
		topic: 'discord.message.created',
	})
})

test('invokeKodyMessageCreated sends authenticated package invocation request', async () => {
	const event = normalizeMessageCreate({
		id: 'message-123',
		channel_id: 'channel-456',
	})
	let capturedInput: RequestInfo | URL | undefined
	let capturedInit: RequestInit | undefined
	const fetcher = (async (input, init) => {
		capturedInput = input
		capturedInit = init

		return new Response(JSON.stringify({ ok: true, result: { handled: true } }), {
			status: 200,
			headers: { 'content-type': 'application/json' },
		})
	}) as typeof fetch

	const result = await invokeKodyMessageCreated(event, {
		baseUrl: 'https://heykody.dev',
		token: 'test-package-invocation-token',
		fetcher,
	})

	assert.deepEqual(result, {
		status: 200,
		body: { ok: true, result: { handled: true } },
	})
	assert.equal(
		capturedInput instanceof URL
			? capturedInput.toString()
			: String(capturedInput),
		'https://heykody.dev/api/package-invocations/discord-gateway/dispatch-message-created',
	)
	assert.equal(capturedInit?.method, 'POST')
	assert.equal(capturedInit?.body, JSON.stringify(buildKodyInvocationBody(event)))

	const headers = new Headers(capturedInit?.headers)
	assert.equal(
		headers.get('authorization'),
		'Bearer test-package-invocation-token',
	)
	assert.equal(headers.get('content-type'), 'application/json')
})

test('parseDiscordIntents accepts numeric and comma-separated intent config', () => {
	assert.equal(parseDiscordIntents('33281'), 33281)
	assert.equal(
		parseDiscordIntents('Guilds,GuildMessages,MessageContent'),
		33281,
	)
})
