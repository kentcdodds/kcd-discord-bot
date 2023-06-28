import type * as Discord from 'discord.js'

type Member = Discord.GuildMember | Discord.PartialGuildMember

export function hasRole(member: Member, roleId: string): boolean {
	return member.roles.cache.has(roleId)
}

export function isEpicWebDev(member: Member) {
	return hasRole(member, process.env.ROLE_ID_EPIC_WEB)
}

export function isEpicReactDev(member: Member) {
	return hasRole(member, process.env.ROLE_ID_EPIC_REACT)
}

export function isTestingJs(member: Member) {
	return hasRole(member, process.env.ROLE_ID_TESTING_JS)
}

export function isModerator(member: Member) {
	return hasRole(member, process.env.ROLE_ID_MODERATORS)
}

export function isMember(member: Member) {
	return hasRole(member, process.env.ROLE_ID_MEMBER)
}

export function getMemberTeam(member: Member) {
	if (hasRole(member, process.env.ROLE_ID_BLUE)) return 'BLUE'
	if (hasRole(member, process.env.ROLE_ID_RED)) return 'RED'
	if (hasRole(member, process.env.ROLE_ID_YELLOW)) return 'YELLOW'
	return 'UNASSIGNED'
}
