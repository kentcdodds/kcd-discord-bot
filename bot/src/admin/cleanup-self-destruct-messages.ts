import type * as TDiscord from 'discord.js'
import { cleanupGuildOnInterval, getSelfDestructTime } from './utils'

async function cleanup(guild: TDiscord.Guild) {
	const channels = [...guild.channels.cache.values()].filter(ch =>
		ch.isTextBased(),
	) as Array<TDiscord.TextBasedChannel>
	if (!guild.client.user) return

	const botId = guild.client.user.id
	const promises = []

	for (const channel of channels) {
		for (const message of [...channel.messages.cache.values()]) {
			if (message.author.id === botId) {
				const timeToSelfDestruct = getSelfDestructTime(message.content)
				if (
					typeof timeToSelfDestruct === 'number' &&
					message.createdAt.getTime() + timeToSelfDestruct < Date.now()
				) {
					promises.push(message.delete())
				}
			}
		}
	}

	return Promise.all(promises)
}

export async function setup(client: TDiscord.Client) {
	void cleanupGuildOnInterval(client, guild => cleanup(guild), 5000)
}
