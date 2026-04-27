import * as Discord from 'discord.js'
import * as Sentry from '@sentry/node'
import {
	getKodyInvocationConfigFromEnv,
	invokeKodyMessageCreated,
	normalizeMessageCreate,
	parseDiscordIntents,
} from './gateway-proxy'

export const ref: {
	client?: Discord.Client
} = {}

export async function start() {
	const kodyInvocationConfig = getKodyInvocationConfigFromEnv()
	const client = (ref.client = new Discord.Client({
		intents: parseDiscordIntents(),
		ws: { version: Number(process.env.DISCORD_GATEWAY_VERSION || '10') },
	}))

	client.on('error', error => {
		Sentry.captureException(error, { tags: { 'discord.source': 'client' } })
	})

	client.on('shardError', (error, shardId) => {
		Sentry.withScope(scope => {
			scope.setTag('discord.source', 'shard')
			scope.setExtra('shardId', shardId)
			Sentry.captureException(error)
		})
	})

	client.once('ready', () => {
		logGatewayProxy('ready', {
			userId: client.user?.id,
			intents: parseDiscordIntents(),
			gatewayVersion: process.env.DISCORD_GATEWAY_VERSION || '10',
		})
	})

	client.ws.on(Discord.GatewayDispatchEvents.MessageCreate, async message => {
		const event = normalizeMessageCreate(message)

		try {
			const result = await invokeKodyMessageCreated(event, kodyInvocationConfig)
			logGatewayProxy('message dispatched', {
				messageId: event.messageId,
				channelId: event.channelId,
				guildId: event.guildId,
				status: result.status,
			})
		} catch (error) {
			Sentry.captureException(error, {
				tags: {
					'discord.source': 'kody-invocation',
					'discord.event': 'MESSAGE_CREATE',
				},
				extra: { messageId: event.messageId },
			})
			logGatewayProxy('message dispatch failed', {
				messageId: event.messageId,
				error: String(error),
			})
		}
	})

	void client.login(process.env.DISCORD_BOT_TOKEN).catch(error => {
		Sentry.captureException(error, { tags: { 'discord.source': 'login' } })
		logGatewayProxy('login failed', { error: String(error) })
	})

	return async function cleanup() {
		Sentry.captureMessage('Client logging out')
		client.destroy()
	}
}

function logGatewayProxy(message: string, data?: Record<string, unknown>) {
	console.log(
		JSON.stringify({
			at: new Date().toISOString(),
			source: 'discord-gateway-proxy',
			message,
			...(data ? { data } : null),
		}),
	)
}
