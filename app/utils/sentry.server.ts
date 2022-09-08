import * as Sentry from '@sentry/node'
import invariant from 'tiny-invariant'

export async function init() {
	if (process.env.NODE_ENV === 'production') {
		invariant(process.env.SENTRY_DSN, 'SENTRY_DSN is required')
		Sentry.init({
			dsn: process.env.SENTRY_DSN,
			tracesSampleRate: 0.3,
			environment: process.env.NODE_ENV,
		})
		Sentry.setContext('region', { name: process.env.FLY_REGION ?? 'unknown' })
	}
}
