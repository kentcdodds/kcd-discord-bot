// When a new YouTube live stream starts, create a new thread in the livestream chat channel
// and send a message with a link to the live stream.

import type * as Discord from 'discord.js'
import { fetchLivestreamChatChannel } from '../utils'
import { lookupYouTubeVideo } from '~/utils/youtube.server'
import { ref } from '../'
import { fetchKCDGuild } from '../utils'
import * as dt from 'date-fns'
import * as dtt from 'date-fns-tz'
import { sendTweet } from '~/utils/twitter.server'

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

	const thread = title.includes('Office Hours')
		? null
		: await createDiscordThread({ id, scheduledStartTime, title, youtubeUrl })

	let tweet: string
	if (thread) {
		tweet = actualStartTime
			? `I'm live on YouTube! Come join the discussion on discord: ${thread.url}\n\n${youtubeUrl}`
			: `Upcoming live stream! Join the discussion on discord: ${thread.url}\n\n${youtubeUrl}`
	} else {
		tweet = actualStartTime
			? `I'm live on YouTube! ${youtubeUrl}`
			: `Upcoming live stream! ${youtubeUrl}`
	}

	void sendTweet(tweet)
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

	const livestreamChat = await fetchLivestreamChatChannel(guild)
	if (!livestreamChat) {
		console.error('no livestream chat channel found')
		return
	}

	await livestreamChat.messages.fetch()
	if (
		livestreamChat.messages.cache.some(({ content }) => content.includes(id))
	) {
		return
	}

	const parsedStartTimeUTC = dt.parseISO(scheduledStartTime)
	const parsedStartTime = dtt.zonedTimeToUtc(
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
