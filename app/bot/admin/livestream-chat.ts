// When a new YouTube live stream starts, create a new thread in the livestream chat channel
// and send a message with a link to the live stream.

import { fetchLivestreamChatChannel, getKcdOfficeHoursChannel } from '../utils'
import { lookupYouTubeVideo } from '~/utils/youtube.server'
import { ref } from '../'
import { fetchKCDGuild } from '../utils'
import * as dt from 'date-fns'
import * as dtt from 'date-fns-tz'
import { sendTweet } from '~/utils/twitter.server'
import {
	GuildScheduledEventEntityType,
	GuildScheduledEventPrivacyLevel,
} from 'discord.js'

export async function handleUpdatedVideo(id: string) {
	const {
		title,
		scheduledStartTime,
		actualStartTime,
		actualEndTime,
		privacyStatus,
		channelId,
	} = (await lookupYouTubeVideo(id)) ?? {}
	if (
		!scheduledStartTime ||
		actualEndTime ||
		privacyStatus !== 'public' ||
		channelId !== process.env.YOUTUBE_KCD_CHANNEL_ID
	) {
		return
	}

	const youtubeUrl = `https://youtu.be/${id}`

	const channel = title.includes('Office Hours')
		? await getOfficeHoursChannel()
		: await createDiscordThread({ id, scheduledStartTime, title, youtubeUrl })

	let tweet: string
	if (channel) {
		tweet = actualStartTime
			? `I'm live on YouTube! Come join the discussion on https://kcd.im/discord: ${channel.url}\n\n${youtubeUrl}`
			: `Upcoming live stream! Join the discussion on https://kcd.im/discord: ${channel.url}\n\n${youtubeUrl}`
	} else {
		tweet = actualStartTime
			? `I'm live on YouTube! ${youtubeUrl}`
			: `Upcoming live stream! ${youtubeUrl}`
	}

	await Promise.all([
		sendTweet(tweet),
		createDiscordScheduledEvent({
			id,
			scheduledStartTime,
			title,
			youtubeUrl,
		}),
	])
}

async function getGuild() {
	const { client } = ref
	if (!client) {
		console.error('no client', ref)
		return
	}

	const guild = await fetchKCDGuild(client)
	if (!guild) {
		console.error('KCD Guild not found')
		return
	}
	return guild
}

async function getOfficeHoursChannel() {
	const guild = await getGuild()
	if (!guild) return
	return getKcdOfficeHoursChannel(guild)
}

async function createDiscordScheduledEvent({
	id,
	title,
	scheduledStartTime,
	youtubeUrl,
}: {
	id: string
	title: string
	scheduledStartTime: string
	youtubeUrl: string
}) {
	const guild = await getGuild()
	if (!guild) return
	await guild.scheduledEvents.fetch()
	const existingEvent = guild.scheduledEvents.cache.find(({ description }) =>
		Boolean(description?.includes(id)),
	)
	if (existingEvent) return
	let startDate = dt.parseISO(scheduledStartTime)
	if (startDate.getTime() < Date.now()) {
		// needs to be in the future, so we'll just put it a bit in the future
		startDate = dt.addSeconds(new Date(), 3)
	}
	// create new event for live stream
	await guild.scheduledEvents.create({
		name: title,
		scheduledStartTime: startDate,
		// we don't really know how long the stream will be so we'll
		// just set it to a few hours
		scheduledEndTime: dt.addHours(startDate, 2),
		entityType: GuildScheduledEventEntityType.External,
		entityMetadata: {
			location: youtubeUrl,
		},
		description: `Kent is live streaming on YouTube! ${youtubeUrl}`,
		privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
	})
}

async function createDiscordThread({
	id,
	title,
	scheduledStartTime,
	youtubeUrl,
}: {
	id: string
	title: string
	scheduledStartTime: string
	youtubeUrl: string
}) {
	const guild = await getGuild()
	if (!guild) return

	const livestreamChat = await fetchLivestreamChatChannel(guild)
	if (!livestreamChat) {
		console.error('no livestream chat channel found')
		return
	}

	await livestreamChat.messages.fetch()
	await livestreamChat.threads.fetch()

	const existingMessage = livestreamChat.messages.cache.find(({ content }) =>
		content.includes(id),
	)
	if (existingMessage) {
		return existingMessage.thread
	}

	const parsedStartTimeUTC = dt.parseISO(scheduledStartTime)
	const parsedStartTime = dtt.utcToZonedTime(
		parsedStartTimeUTC,
		'America/Denver',
	)
	const formattedStartTimeForTitle = dt.format(
		parsedStartTime,
		'yyyy-MM-dd haaa',
	)
	const formattedStartTimeForMessage = dt.format(
		parsedStartTime,
		'yyyy-MM-dd h:mmaaa',
	)

	const message = await livestreamChat.send(
		`New livestream scheduled: ${youtubeUrl}`,
	)
	const thread = await message.startThread({
		name: `${formattedStartTimeForTitle} - ${title}`,
	})
	await thread.send(
		`A new livestream has been scheduled for ${formattedStartTimeForMessage}. Chat about it here!`,
	)
	return thread
}
