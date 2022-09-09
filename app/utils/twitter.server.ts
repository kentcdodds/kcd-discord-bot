import OAuth from 'oauth-1.0a'
import crypto from 'crypto'

export async function sendTweet(tweet: string) {
	const oauth = new OAuth({
		consumer: {
			key: process.env.TWITTER_CONSUMER_KEY,
			secret: process.env.TWITTER_CONSUMER_KEY_SECRET,
		},
		signature_method: 'HMAC-SHA1',
		hash_function: (baseString, key) =>
			crypto.createHmac('sha1', key).update(baseString).digest('base64'),
	})

	const url = 'https://api.twitter.com/2/tweets'

	const authHeader = oauth.toHeader(
		oauth.authorize(
			{ url, method: 'POST' },
			{
				key: process.env.TWITTER_ACCESS_TOKEN,
				secret: process.env.TWITTER_ACCESS_SECRET,
			},
		),
	)

	const response = await fetch(url, {
		method: 'POST',
		body: JSON.stringify({ text: tweet }),
		headers: {
			Authorization: authHeader['Authorization'],
			'user-agent': 'KCD_YouTube_Twitter_Bot',
			'content-type': 'application/json',
			accept: 'application/json',
		},
	})
	const json = await response.json()
	return json
}
