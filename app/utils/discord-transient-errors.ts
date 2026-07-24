/**
 * Predicates for expected Discord operational noise on a long-lived bot:
 * transient REST 503s and gateway reconnect handshake failures.
 * Discord.js already retries REST 5xx and reconnects the gateway; these
 * events are not actionable application bugs.
 */

const TRANSIENT_GATEWAY_MESSAGES = new Set([
	'Opening handshake has timed out',
	'Unexpected server response: 502',
	'Unexpected server response: 503',
	'Unexpected server response: 520',
	'Unexpected server response: 521',
	'Unexpected server response: 522',
	'Unexpected server response: 524',
])

export function getErrorMessage(error: unknown): string {
	if (typeof error === 'string') return error
	if (error instanceof Error) return error.message
	return ''
}

export function isTransientDiscordHttpError(error: unknown): boolean {
	if (!error || typeof error !== 'object') return false
	const candidate = error as {
		name?: unknown
		message?: unknown
		status?: unknown
	}
	if (candidate.name !== 'HTTPError') return false
	if (typeof candidate.status === 'number') {
		return candidate.status === 503 || candidate.status === 502
	}
	return (
		candidate.message === 'Service Unavailable' ||
		candidate.message === 'Bad Gateway'
	)
}

export function isTransientDiscordGatewayError(error: unknown): boolean {
	return TRANSIENT_GATEWAY_MESSAGES.has(getErrorMessage(error))
}

export function isTransientDiscordError(error: unknown): boolean {
	return (
		isTransientDiscordHttpError(error) || isTransientDiscordGatewayError(error)
	)
}

type SentryEventLike = {
	exception?: {
		values?: Array<{
			type?: string | null
			value?: string | null
		}>
	}
}

/**
 * Narrow beforeSend drop for Discord transient noise that still reaches Sentry
 * (e.g. historical onunhandledrejection from cache refresh, or shard errors).
 */
export function shouldDropTransientDiscordSentryEvent(
	event: SentryEventLike,
	hint?: { originalException?: unknown },
): boolean {
	if (hint?.originalException != null) {
		return isTransientDiscordError(hint.originalException)
	}
	const values = event.exception?.values
	if (!values?.length) return false
	return values.some(value =>
		isTransientDiscordError({
			name: value.type ?? undefined,
			message: value.value ?? undefined,
			status:
				value.type === 'HTTPError' && value.value === 'Service Unavailable'
					? 503
					: undefined,
		}),
	)
}
