import { ref } from '~/bot'
import { fetchKCDGuild } from '~/bot/utils'

export async function addEpicWebRoleToUser(userId: string) {
	const guild = await getGuild()
	if (!guild) return { status: 'error', error: 'KCD Guild not found' } as const
	const epicWebRoleId = process.env.ROLE_ID_EPIC_WEB
	await guild.members.fetch(userId)
	const member = guild.members.cache.get(userId)
	if (!member) return { status: 'error', error: 'Member not found' } as const
	await member.roles.add(epicWebRoleId)
	await member.setNickname(`${member.displayName} 🌌`)
	return { status: 'success', member } as const
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
