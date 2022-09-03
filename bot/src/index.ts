import path from 'path'
import * as Sentry from '@sentry/node'
import dotenv from 'dotenv'
import invariant from 'tiny-invariant'
import { start } from './start'

dotenv.config({ path: path.join(__dirname, '../../.env') })

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
	'ROLE_ID_TESTING_JS',
	'ROLE_ID_EPIC_REACT',
	'ROLE_ID_MODERATORS',
	'ROLE_ID_MEMBER',
] as const
for (const env of requiredEnvs) {
	invariant(process.env[env], `${env} is required`)
}

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
			ROLE_ID_TESTING_JS: string
			ROLE_ID_EPIC_REACT: string
			ROLE_ID_MODERATORS: string
			ROLE_ID_MEMBER: string
		}
	}
}

export const ref: { cleanup: Function | undefined } = {
	cleanup: undefined,
}

if (process.env.NODE_ENV === 'production') {
	invariant(process.env.SENTRY_DSN, 'SENTRY_DSN is required')
	Sentry.init({
		dsn: process.env.SENTRY_DSN,
		tracesSampleRate: 0.3,
		environment: process.env.NODE_ENV,
	})
	Sentry.setContext('region', { name: process.env.FLY_REGION ?? 'unknown' })
}

start().then(c => (ref.cleanup = c))
