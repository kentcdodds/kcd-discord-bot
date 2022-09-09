type YouTubeVideoItemData = {
	snippet: { title: string; channelId: string }
	liveStreamingDetails?: {
		scheduledStartTime?: string
		actualEndTime?: string
		actualStartTime?: string
	}
	status: { privacyStatus: 'private' | 'public' | 'unlisted' }
}
type YouTubeVideoData = {
	// yes, I'm saying it's an array of one item and maybe it could return more
	// but that would be exceedingly weird since we're specifying the ID...
	items: [YouTubeVideoItemData]
}
const isObj = (obj: unknown): obj is Record<string, unknown> =>
	typeof obj === 'object' && obj !== null
const isStr = (str: unknown): str is string => typeof str === 'string'
const isDateStr = (str: unknown): str is string =>
	typeof str === 'string' && !isNaN(Date.parse(str))

function validateYouTubeResponse(data: any): data is YouTubeVideoData {
	if (!isObj(data)) return false
	if (!Array.isArray(data.items)) return false
	const item = data.items[0]
	if (!isObj(item)) return false
	const { snippet, liveStreamingDetails, status } = item
	if (!isObj(snippet)) return false
	if (!isStr(snippet.title)) return false
	if (liveStreamingDetails) {
		if (!isObj(liveStreamingDetails)) return false
		if (
			liveStreamingDetails.scheduledStartTime &&
			!isDateStr(liveStreamingDetails.scheduledStartTime)
		) {
			return false
		}
		if (
			liveStreamingDetails.actualEndTime &&
			!isDateStr(liveStreamingDetails.actualEndTime)
		) {
			return false
		}
	}
	if (!isObj(status)) return false
	if (!isStr(status.privacyStatus)) return false
	if (!['private', 'public', 'unlisted'].includes(status.privacyStatus)) {
		return false
	}
	return true
}

export async function lookupYouTubeVideo(id: string) {
	const url = new URL('https://www.googleapis.com/youtube/v3/videos')
	url.searchParams.set('part', 'snippet,liveStreamingDetails,status')
	url.searchParams.set('id', id)
	url.searchParams.set('key', process.env.YOUTUBE_API_KEY)
	const response = await fetch(url)
	const json = await response.json()
	if (!validateYouTubeResponse(json)) {
		console.error(json, json.items[0])
		throw new Error('Invalid YouTube response')
	}
	const [video] = json.items
	const {
		snippet: { title, channelId },
		liveStreamingDetails: {
			scheduledStartTime,
			actualEndTime,
			actualStartTime,
		} = {},
		status: { privacyStatus },
	} = video
	return {
		title,
		channelId,
		privacyStatus,
		scheduledStartTime,
		actualEndTime,
		actualStartTime,
	}
}
