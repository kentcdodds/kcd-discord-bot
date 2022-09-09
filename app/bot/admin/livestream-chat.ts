// When a new YouTube live stream starts, create a new thread in the livestream chat channel
// and send a message with a link to the live stream.

import { fetchLivestreamChatChannel } from '../utils'
import { lookupYouTubeVideo } from '~/utils/youtube.server'
import { ref } from '../'
import { fetchKCDGuild } from '../utils'
import * as dt from 'date-fns'

export async function handleUpdatedVideo(id: string) {
	const video = await lookupYouTubeVideo(id)
	if (
		!video ||
		!video.scheduledStartTime ||
		video.actualEndTime ||
		video.privacyStatus !== 'public' ||
		video.channelId !== process.env.YOUTUBE_KCD_CHANNEL_ID ||
		video.title.includes('Office Hours') // we've already got a channel for this
	) {
		return
	}
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

	const parsedStartTime = dt.parseISO(video.scheduledStartTime)
	const formattedStartTimeForTitle = dt.format(
		parsedStartTime,
		'yyyy-MM-dd haaa',
	)
	const formattedStartTimeForMessage = dt.format(
		parsedStartTime,
		'yyyy-MM-dd h:mmaaa',
	)

	const message = await livestreamChat.send(
		`New livestream scheduled: https://youtu.be/${id}`,
	)
	const thread = await message.startThread({
		name: `${formattedStartTimeForTitle} - ${video.title}`,
	})
	await thread.send(
		`A new livestream has been scheduled for ${formattedStartTimeForMessage}. Chat about it here!`,
	)
}
