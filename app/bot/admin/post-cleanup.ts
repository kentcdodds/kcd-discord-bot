import * as Discord from 'discord.js'
import {
	cleanupGuildOnInterval,
	getBotLogChannel,
	getErrorMessage,
} from './utils'

type ScheduledDeletion = {
	type: string
	channelId: string
	messageId: string
	deleteAt: Date
}

const FOOTER_PREFIX = 'scheduled-delete'
const INTERVAL_MS = 30 * 1000
const COMPLETION_FIELD_NAME = 'Cleanup Result'

function parseScheduledDeletion(embed: Discord.Embed) {
	const footerText = embed.footer?.text
	if (!footerText) return null
	const [prefix, type, channelId, messageId, isoTimestamp] =
		footerText.split('|')
	if (
		prefix !== FOOTER_PREFIX ||
		!type ||
		!channelId ||
		!messageId ||
		!isoTimestamp
	) {
		return null
	}
	const deleteAt = new Date(isoTimestamp)
	if (Number.isNaN(deleteAt.getTime())) return null
	return {
		type,
		channelId,
		messageId,
		deleteAt,
	} satisfies ScheduledDeletion
}

async function deleteTargetMessage(
	guild: Discord.Guild,
	info: ScheduledDeletion,
) {
	try {
		const targetChannel = await guild.channels.fetch(info.channelId)
		if (!targetChannel?.isTextBased()) {
			return { outcome: 'missing' as const, reason: 'channel inaccessible' }
		}

		const targetMessage = await targetChannel.messages
			.fetch(info.messageId)
			.catch(error => {
				if (
					error instanceof Discord.DiscordAPIError &&
					error.code === Discord.RESTJSONErrorCodes.UnknownMessage
				) {
					return null
				}
				throw error
			})

		if (!targetMessage) {
			return { outcome: 'missing' as const, reason: 'message missing' }
		}

		await targetMessage.delete()
		return { outcome: 'deleted' as const }
	} catch (error: unknown) {
		return {
			outcome: 'failed' as const,
			reason: getErrorMessage(error),
		}
	}
}

function buildCleanupResultField(
	outcome:
		| { outcome: 'deleted' }
		| { outcome: 'missing'; reason: string }
		| { outcome: 'failed'; reason: string },
) {
	const nowSeconds = Math.floor(Date.now() / 1000)
	if (outcome.outcome === 'deleted') {
		return {
			name: COMPLETION_FIELD_NAME,
			value: `Deleted automatically at <t:${nowSeconds}:F> (<t:${nowSeconds}:R>).`,
		}
	}
	if (outcome.outcome === 'missing') {
		return {
			name: COMPLETION_FIELD_NAME,
			value: `Skipped cleanup because the message was already gone (${outcome.reason}) at <t:${nowSeconds}:F>.`,
		}
	}
	return {
		name: COMPLETION_FIELD_NAME,
		value: `Unable to delete the message at <t:${nowSeconds}:F>. Reason: ${outcome.reason}`,
	}
}

function updateEmbedWithResult(
	embed: Discord.Embed,
	outcome:
		| { outcome: 'deleted' }
		| { outcome: 'missing'; reason: string }
		| { outcome: 'failed'; reason: string },
) {
	const embedData = embed.toJSON()
	const existingFields = embedData.fields ?? []
	const filteredFields = existingFields.filter(
		field => field.name !== COMPLETION_FIELD_NAME,
	)
	filteredFields.push(buildCleanupResultField(outcome))

	embedData.fields = filteredFields
	embedData.timestamp = new Date().toISOString()
	delete embedData.footer

	if (outcome.outcome === 'deleted') {
		embedData.color = Discord.Colors.Green
	} else if (outcome.outcome === 'missing') {
		embedData.color = Discord.Colors.Grey
	} else {
		embedData.color = Discord.Colors.Red
	}

	return embedData
}

async function processLogMessage(message: Discord.Message<true>) {
	const { guild } = message
	const botId = guild.client.user?.id
	if (!botId || message.author.id !== botId) return

	let shouldEdit = false
	const updatedEmbeds: Discord.APIEmbed[] = []

	for (const embed of message.embeds) {
		const schedule = parseScheduledDeletion(embed)
		if (!schedule) {
			updatedEmbeds.push(embed.toJSON())
			continue
		}

		if (schedule.deleteAt.getTime() > Date.now()) {
			updatedEmbeds.push(embed.toJSON())
			continue
		}

		const outcome = await deleteTargetMessage(guild, schedule)
		const updatedEmbed = updateEmbedWithResult(embed, outcome)
		updatedEmbeds.push(updatedEmbed)
		shouldEdit = true
	}

	if (shouldEdit) {
		await message.edit({ embeds: updatedEmbeds })
	}
}

async function cleanupGuild(guild: Discord.Guild) {
	const botLogChannel = getBotLogChannel(guild)
	if (!botLogChannel) return

	const messages = await botLogChannel.messages.fetch({ limit: 50 })
	for (const message of messages.values()) {
		await processLogMessage(message)
	}
}

export async function setup(client: Discord.Client) {
	void cleanupGuildOnInterval(client, guild => cleanupGuild(guild), INTERVAL_MS)
}

