import type * as Discord from 'discord.js'

type Member = Discord.GuildMember | Discord.PartialGuildMember

export function isEpicReactDev(member: Member) {
	return member.roles.cache.some(
		({ id }) => id === process.env.ROLE_ID_EPIC_REACT,
	)
}

export function isTestingJs(member: Member) {
	return member.roles.cache.some(
		({ id }) => id === process.env.ROLE_ID_TESTING_JS,
	)
}

export function isModerator(member: Member) {
	return member.roles.cache.some(
		({ id }) => id === process.env.ROLE_ID_MODERATORS,
	)
}
