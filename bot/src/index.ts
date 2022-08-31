import path from 'path'
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
	'ROLE_ID_TESTING_JS',
	'ROLE_ID_EPIC_REACT',
	'ROLE_ID_MODERATORS',
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
			ROLE_ID_TESTING_JS: string
			ROLE_ID_EPIC_REACT: string
			ROLE_ID_MODERATORS: string
		}
	}
}

export const ref: { cleanup: Function | undefined } = {
	cleanup: undefined,
}
start().then(c => (ref.cleanup = c))
