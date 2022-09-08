import * as Discord from 'discord.js'

export function getBotLogChannel(guild: Discord.Guild) {
	const channel = guild.channels.cache.get(process.env.CHANNEL_ID_BOT_LOGS)
	if (channel?.type !== Discord.ChannelType.GuildText) return null
	return channel
}

export function getTalkToBotsChannel(guild: Discord.Guild) {
	const channel = guild.channels.cache.get(process.env.CHANNEL_ID_TALK_TO_BOTS)
	if (channel?.type !== Discord.ChannelType.GuildText) return null
	return channel
}

export function getReportsChannel(guild: Discord.Guild) {
	const channel = guild.channels.cache.get(process.env.CHANNEL_ID_REPORTS)
	if (channel?.type !== Discord.ChannelType.GuildText) return null
	return channel
}

export function getKcdOfficeHoursChannel(guild: Discord.Guild) {
	const channel = guild.channels.cache.get(
		process.env.CHANNEL_ID_KCD_OFFICE_HOURS,
	)
	if (channel?.type !== Discord.ChannelType.GuildText) return null
	return channel
}

export function getIntroductionsChannel(guild: Discord.Guild) {
	const channel = guild.channels.cache.get(process.env.CHANNEL_ID_INTRODUCTIONS)
	if (channel?.type !== Discord.ChannelType.GuildText) return null
	return channel
}

export function getTipsChannel(guild: Discord.Guild) {
	const channel = guild.channels.cache.get(process.env.CHANNEL_ID_TIPS)
	if (channel?.type !== Discord.ChannelType.GuildText) return null
	return channel
}

export function getHowToJoinChannel(guild: Discord.Guild) {
	const channel = guild.channels.cache.get(process.env.CHANNEL_ID_HOW_TO_JOIN)
	if (channel?.type !== Discord.ChannelType.GuildText) return null
	return channel
}

export function getLivestreamChatChannel(guild: Discord.Guild) {
	const channel = guild.channels.cache.get(
		process.env.CHANNEL_ID_LIVESTREAM_CHAT,
	)
	if (channel?.type !== Discord.ChannelType.GuildText) return null
	return channel
}

export async function fetchLivestreamChatChannel(guild: Discord.Guild) {
	const channel = await guild.channels.fetch(
		process.env.CHANNEL_ID_LIVESTREAM_CHAT,
	)
	if (channel?.type !== Discord.ChannelType.GuildText) return null
	return channel
}
