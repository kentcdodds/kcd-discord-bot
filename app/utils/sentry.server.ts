import * as Sentry from '@sentry/node'
import { invariant } from '~/utils'
import { shouldDropTransientDiscordSentryEvent } from './discord-transient-errors'

export async function init() {
	if (process.env.NODE_ENV === 'production') {
		invariant(process.env.SENTRY_DSN, 'SENTRY_DSN is required')
		const commit = process.env.COMMIT_SHA
		Sentry.init({
			dsn: process.env.SENTRY_DSN,
			tracesSampleRate: 0.3,
			environment: process.env.NODE_ENV,
			// Give the transport time to flush before process exit on uncaught errors
			shutdownTimeout: 5000,
			// Discord.js reconnects after these; don't page on gateway blips.
			ignoreErrors: [
				'Opening handshake has timed out',
				'Unexpected server response: 503',
				'Unexpected server response: 502',
			],
			beforeSend(event, hint) {
				if (shouldDropTransientDiscordSentryEvent(event, hint)) {
					return null
				}
				return event
			},
			...(commit ? { release: commit } : {}),
		})
		Sentry.setContext('fly', {
			app: process.env.FLY_APP_NAME ?? 'unknown',
			region: process.env.FLY_REGION ?? 'unknown',
			machineId: process.env.FLY_MACHINE_ID ?? 'unknown',
			allocId: process.env.FLY_ALLOC_ID ?? 'unknown',
		})
		if (commit) Sentry.setTag('commit_short', commit.slice(0, 7))
	}
}
