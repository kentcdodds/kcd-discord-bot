import * as Discord from 'discord.js'

import { invariant } from '../utils'

const DISCORD_GATEWAY_INTENT_BY_NAME = {
	Guilds: Discord.GatewayIntentBits.Guilds,
	GuildMessages: Discord.GatewayIntentBits.GuildMessages,
	MessageContent: Discord.GatewayIntentBits.MessageContent,
	DirectMessages: Discord.GatewayIntentBits.DirectMessages,
} as const

export const DEFAULT_KODY_BASE_URL = 'https://heykody.dev'
export const DEFAULT_DISCORD_GATEWAY_VERSION = '10'
export const DEFAULT_DISCORD_INTENTS =
	Discord.GatewayIntentBits.Guilds |
	Discord.GatewayIntentBits.GuildMessages |
	Discord.GatewayIntentBits.MessageContent

export type DiscordMessageCreateData = {
	id: string
	channel_id?: string
	guild_id?: string
	content?: string
	timestamp?: string
	author?: {
		id?: string
		username?: string
		global_name?: string | null
		bot?: boolean
	}
	message_reference?: {
		message_id?: string
	}
	[key: string]: unknown
}

export type KodyDiscordMessageCreatedEvent = {
	type: 'message.created'
	eventId: string
	occurredAt: string
	guildId: string | null
	channelId: string | null
	parentChannelId: string | null
	threadId: string | null
	threadName: string | null
	messageId: string
	content: string
	author: {
		id: string
		username: string
		globalName: string | null
		bot: boolean
	}
	referenceMessageId: string | null
	raw: DiscordMessageCreateData
}

export type KodyInvocationBody = {
	params: {
		event: KodyDiscordMessageCreatedEvent
	}
	idempotencyKey: string
	source: 'discord-gateway'
	topic: 'discord.message.created'
}

export type KodyInvocationConfig = {
	baseUrl: string
	token: string
	fetcher?: typeof fetch
}

export function parseDiscordIntents(value = process.env.DISCORD_INTENTS) {
	if (!value) return DEFAULT_DISCORD_INTENTS

	const numericValue = Number(value)
	if (Number.isInteger(numericValue) && numericValue >= 0) return numericValue

	return value.split(',').reduce((intents, rawName) => {
		const name = rawName.trim()
		invariant(name, 'DISCORD_INTENTS cannot include an empty intent name')
		invariant(
			name in DISCORD_GATEWAY_INTENT_BY_NAME,
			`Unknown Discord intent "${name}"`,
		)

		return (
			intents |
			DISCORD_GATEWAY_INTENT_BY_NAME[
				name as keyof typeof DISCORD_GATEWAY_INTENT_BY_NAME
			]
		)
	}, 0)
}

export function getKodyInvocationConfigFromEnv(): KodyInvocationConfig {
	invariant(
		process.env.KODY_PACKAGE_INVOCATION_TOKEN,
		'KODY_PACKAGE_INVOCATION_TOKEN is required',
	)

	return {
		baseUrl: process.env.KODY_BASE_URL || DEFAULT_KODY_BASE_URL,
		token: process.env.KODY_PACKAGE_INVOCATION_TOKEN,
	}
}

export function normalizeMessageCreate(
	data: DiscordMessageCreateData,
	receivedAt = new Date(),
): KodyDiscordMessageCreatedEvent {
	const author = data.author || {}

	return {
		type: 'message.created',
		eventId: `gateway:${data.id}`,
		occurredAt: data.timestamp || receivedAt.toISOString(),
		guildId: data.guild_id || null,
		channelId: data.channel_id || null,
		parentChannelId: null,
		threadId: null,
		threadName: null,
		messageId: data.id,
		content: typeof data.content === 'string' ? data.content : '',
		author: {
			id: author.id || '',
			username: author.username || '',
			globalName: author.global_name || null,
			bot: Boolean(author.bot),
		},
		referenceMessageId: data.message_reference?.message_id || null,
		raw: data,
	}
}

export function buildKodyInvocationBody(
	event: KodyDiscordMessageCreatedEvent,
): KodyInvocationBody {
	return {
		params: { event },
		idempotencyKey: `discord:message-create:${event.messageId}`,
		source: 'discord-gateway',
		topic: 'discord.message.created',
	}
}

export async function invokeKodyMessageCreated(
	event: KodyDiscordMessageCreatedEvent,
	config: KodyInvocationConfig,
) {
	const url = new URL(
		'/api/package-invocations/discord-gateway/dispatch-message-created',
		config.baseUrl,
	)
	const fetcher = config.fetcher || fetch
	const response = await fetcher(url, {
		method: 'POST',
		headers: {
			authorization: `Bearer ${config.token}`,
			'content-type': 'application/json',
		},
		body: JSON.stringify(buildKodyInvocationBody(event)),
	})
	const text = await response.text()
	let body: unknown = null

	try {
		body = text ? JSON.parse(text) : null
	} catch {
		body = { raw: text }
	}

	if (!response.ok && response.status !== 409) {
		throw new Error(`Kody invocation failed ${response.status}: ${text}`)
	}

	return {
		status: response.status,
		body,
	}
}
