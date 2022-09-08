import invariant from 'tiny-invariant'

declare global {
	namespace NodeJS {
		interface ProcessEnv {
			DISCORD_BOT_TOKEN: string
			KCD_GUILD_ID: string
			DISCORD_APP_ID: string

			CHANNEL_ID_BOT_LOGS: string
			CHANNEL_ID_TALK_TO_BOTS: string
			CHANNEL_ID_REPORTS: string
			CHANNEL_ID_KCD_OFFICE_HOURS: string
			CHANNEL_ID_INTRODUCTIONS: string
			CHANNEL_ID_TIPS: string
			CHANNEL_ID_HOW_TO_JOIN: string
			CHANNEL_ID_LIVESTREAM_CHAT: string

			ROLE_ID_TESTING_JS: string
			ROLE_ID_EPIC_REACT: string
			ROLE_ID_MODERATORS: string
			ROLE_ID_MEMBER: string
			ROLE_ID_RED: string
			ROLE_ID_YELLOW: string
			ROLE_ID_BLUE: string

			YOUTUBE_API_KEY: string
			YOUTUBE_KCD_CHANNEL_ID: string
		}
	}
}

export function init() {
	const requiredEnvs = [
		'DISCORD_BOT_TOKEN',
		'KCD_GUILD_ID',
		'DISCORD_APP_ID',

		'CHANNEL_ID_BOT_LOGS',
		'CHANNEL_ID_TALK_TO_BOTS',
		'CHANNEL_ID_REPORTS',
		'CHANNEL_ID_KCD_OFFICE_HOURS',
		'CHANNEL_ID_INTRODUCTIONS',
		'CHANNEL_ID_TIPS',
		'CHANNEL_ID_HOW_TO_JOIN',
		'CHANNEL_ID_LIVESTREAM_CHAT',

		'ROLE_ID_TESTING_JS',
		'ROLE_ID_EPIC_REACT',
		'ROLE_ID_MODERATORS',
		'ROLE_ID_MEMBER',
		'ROLE_ID_RED',
		'ROLE_ID_YELLOW',
		'ROLE_ID_BLUE',

		'YOUTUBE_API_KEY',
		'YOUTUBE_KCD_CHANNEL_ID',
	] as const
	for (const env of requiredEnvs) {
		invariant(process.env[env], `${env} is required`)
	}
}
