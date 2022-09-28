// guided by this video: https://www.youtube.com/watch?v=QQSJGS2JR4w
// "docs" https://developers.google.com/youtube/v3/guides/push_notifications
// subscribe: https://pubsubhubbub.appspot.com/subscribe
// status: https://pubsubhubbub.appspot.com/subscription-details?hub.callback=https%3A%2F%2Fkcd-discord-bot-v2.fly.dev%2Fresources%2Fyoutube-push-callback&hub.topic=https%3A%2F%2Fwww.youtube.com%2Fxml%2Ffeeds%2Fvideos.xml%3Fchannel_id%3DUCz-BYvuntVRt_VpfR6FKXJw&hub.secret=
// keeps this subscribed: https://github.com/kentcdodds/youtube-websub-resub
import type { ActionArgs, LoaderArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import * as htmlparser2 from 'htmlparser2'
import { handleUpdatedVideo } from '~/bot/admin/livestream-chat'

// the loader is for when YouTube wants to verify our webhook
export async function loader({ request }: LoaderArgs) {
	const url = new URL(request.url)
	const challenge = url.searchParams.get('hub.challenge')
	return new Response(challenge)
}

// the action actually receives the data from YouTube
export async function action({ request }: ActionArgs) {
	const feedText = await request.text()
	const feed = htmlparser2.parseFeed(feedText)
	const id = feed?.items?.[0]?.id?.slice('yt:video:'.length)

	// if we can't get the ID then we can't do anything anyway
	// void because the response doesn't change either way. No need to make YouTube wait for it...
	if (id) {
		void handleUpdatedVideo(id)
	} else {
		console.error(`Unable to find ID from feed`, feed)
	}

	return json({ status: 'ok' })
}
