import * as Sentry from '@sentry/node'
import { invariant } from '~/utils'

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
