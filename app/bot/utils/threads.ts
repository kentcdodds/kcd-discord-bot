import * as Discord from 'discord.js'
import * as Sentry from '@sentry/node'

type MemberThreadCreateOptions = {
	name: string
	autoArchiveDuration?: Discord.ThreadAutoArchiveDuration
	reason?: string
}

// Discord made private threads available to all servers (permission-based, not
// boost-gated), so gating on premiumTier/PRIVATE_THREADS wrongly forces public
// threads on guilds below Boost Level 2. Always try private first and only fall
// back to public when the API rejects it.
export async function createPrivateOrPublicThread(
	channel: Discord.TextChannel,
	options: MemberThreadCreateOptions,
): Promise<Discord.ThreadChannel> {
	try {
		return await channel.threads.create({
			...options,
			type: Discord.ChannelType.PrivateThread,
		})
	} catch (error: unknown) {
		if (!isPrivateThreadUnavailableError(error)) throw error
		Sentry.captureException(error, {
			tags: { 'discord.fallback': 'public-thread' },
			extra: {
				guildId: channel.guildId,
				channelId: channel.id,
				threadName: options.name,
			},
		})
	}

	return channel.threads.create({
		...options,
		type: Discord.ChannelType.PublicThread,
	})
}

function isPrivateThreadUnavailableError(error: unknown) {
	if (!(error instanceof Discord.DiscordAPIError)) return false

	const unavailableCodes = new Set<number | string>([
		Discord.RESTJSONErrorCodes.MissingAccess,
		Discord.RESTJSONErrorCodes.MissingPermissions,
		Discord.RESTJSONErrorCodes.GuildPremiumSubscriptionLevelTooLow,
	])

	return unavailableCodes.has(error.code)
}
