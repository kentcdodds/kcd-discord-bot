import type * as TDiscord from 'discord.js'
import { isModerator } from '../utils/roles'
import { getTalkToBotsChannel } from './utils'

export function setup(client: TDiscord.Client) {
	client.on('guildMemberUpdate', async (oldMember, member) => {
		const oldHasModRole = isModerator(oldMember)
		const newHasModRole = isModerator(member)
		const isNewMod = newHasModRole && !oldHasModRole
		const isDemotedMod = oldHasModRole && !newHasModRole

		if (isNewMod) {
			await member.setNickname(`${member.displayName} ◆`)
			return
		}

		const nonModDisplayName = (member.nickname ?? member.displayName)
			.replace(/◆/g, '')
			.trim()

		if (isDemotedMod) {
			await member.setNickname(nonModDisplayName)
			return
		}

		const hasBadge = member.nickname?.includes('◆')
		if (!hasBadge) return
		if (isModerator(member)) return

		await member.setNickname(nonModDisplayName)

		const botsChannel = getTalkToBotsChannel(member.guild)
		await botsChannel?.send(
			`
Hi ${member.user}, I noticed you added "◆" to your nickname. I'm afraid you can't do this because it's reserved for Moderators, so I've removed it.
			`.trim(),
		)
	})
}
