import { invariant } from '../utils'

declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace NodeJS {
		interface ProcessEnv {
			DISCORD_BOT_TOKEN: string
			KODY_PACKAGE_INVOCATION_TOKEN: string
			KODY_BASE_URL?: string
			DISCORD_INTENTS?: string
			DISCORD_GATEWAY_VERSION?: string
			KCD_GUILD_ID: string
			DISCORD_APP_ID: string
			DISCORD_CLIENT_SECRET: string
			SEARCH_WORKER_URL: string
			SEARCH_WORKER_TOKEN: string

			CHANNEL_ID_BOT_LOGS: string
			CHANNEL_ID_TALK_TO_BOTS: string
			CHANNEL_ID_REPORTS: string
			CHANNEL_ID_KCD_OFFICE_HOURS: string
			CHANNEL_ID_INTRODUCTIONS: string
			CHANNEL_ID_TIPS: string
			CHANNEL_ID_HOW_TO_JOIN: string
			CHANNEL_ID_HELP_JOINING: string
			CHANNEL_ID_JOBS: string
			CHANNEL_ID_LIVESTREAM_CHAT: string
			CHANNEL_ID_EPIC_WEB_FORUM: string

			ROLE_ID_TESTING_JS: string
			ROLE_ID_EPIC_WEB: string
			ROLE_ID_EPIC_REACT_V2: string
			ROLE_ID_EPIC_REACT: string
			ROLE_ID_EPIC_AI_COHORT_001: string
			ROLE_ID_EPIC_AI: string
			ROLE_ID_MODERATORS: string
			ROLE_ID_MEMBER: string
			ROLE_ID_RED: string
			ROLE_ID_YELLOW: string
			ROLE_ID_BLUE: string

			YOUTUBE_API_KEY: string
			YOUTUBE_KCD_CHANNEL_ID: string

			TWITTER_CONSUMER_KEY: string
			TWITTER_CONSUMER_KEY_SECRET: string
			TWITTER_ACCESS_TOKEN: string
			TWITTER_ACCESS_SECRET: string
		}
	}
}

export function init() {
	const requiredEnvs = [
		'DISCORD_BOT_TOKEN',
		'KODY_PACKAGE_INVOCATION_TOKEN',
	] as const
	for (const env of requiredEnvs) {
		invariant(process.env[env], `${env} is required`)
	}
}
