import * as Discord from 'discord.js'

type MemberThreadCreateOptions = {
	name: string
	autoArchiveDuration?: Discord.ThreadAutoArchiveDuration
	reason?: string
}

export async function guildSupportsPrivateThreads(
	guild: Discord.Guild,
): Promise<boolean> {
	const freshGuild = await guild.fetch()

	return (
		freshGuild.features.includes(Discord.GuildFeature.PrivateThreads) ||
		[
			Discord.GuildPremiumTier.Tier2,
			Discord.GuildPremiumTier.Tier3,
		].includes(freshGuild.premiumTier)
	)
}

export async function createPrivateOrPublicThread(
	channel: Discord.TextChannel,
	options: MemberThreadCreateOptions,
): Promise<Discord.ThreadChannel> {
	if (await guildSupportsPrivateThreads(channel.guild)) {
		try {
			return await channel.threads.create({
				...options,
				type: Discord.ChannelType.PrivateThread,
			})
		} catch (error: unknown) {
			if (!isPrivateThreadUnavailableError(error)) throw error
		}
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
		Discord.RESTJSONErrorCodes.CannotExecuteActionOnThisChannelType,
		Discord.RESTJSONErrorCodes.GuildPremiumSubscriptionLevelTooLow,
	])

	return unavailableCodes.has(error.code)
}
