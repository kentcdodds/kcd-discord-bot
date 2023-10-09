import { ref } from '~/bot'
import { fetchKCDGuild } from '~/bot/utils'

export async function addEpicWebRoleToUser(userId: string) {
	const guild = await getGuild()
	if (!guild) return
	const epicWebRoleId = process.env.ROLE_ID_EPIC_WEB
	await guild.members.fetch(userId)
	const member = guild.members.cache.get(userId)
	if (!member) return
	console.log(userId, member, member.roles, epicWebRoleId)
	await member.roles.add(epicWebRoleId)
	await member.setNickname(`${member.displayName} 🌌`)
}

async function getGuild() {
	const { client } = ref
	if (!client) {
		console.error('no client', ref)
		return
	}

	const guild = await fetchKCDGuild(client)
	if (!guild) {
		console.error('KCD Guild not found')
		return
	}
	return guild
}
