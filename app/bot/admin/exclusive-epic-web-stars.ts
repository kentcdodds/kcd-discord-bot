import type * as TDiscord from 'discord.js'
import { isEpicWebDev } from '../utils/roles'
import { getTalkToBotsChannel } from './utils'

export function setup(client: TDiscord.Client) {
	client.on('guildMemberUpdate', async (oldMember, member) => {
		const oldHasEpicWebRole = isEpicWebDev(oldMember)
		const newHasEpicWebRole = isEpicWebDev(member)
		const isNewEpicWebDev = newHasEpicWebRole && !oldHasEpicWebRole
		const hasStars = member.nickname?.includes('🌌')

		if (isNewEpicWebDev && !hasStars) {
			await member.setNickname(`${member.displayName} 🌌`)
			return
		}

		if (newHasEpicWebRole) return

		if (!hasStars) return

		await member.setNickname(member.displayName.replace(/🌌/g, '').trim())

		const botsChannel = getTalkToBotsChannel(member.guild)
		await botsChannel?.send(
			`
Hi ${member.user}, I noticed you added the milky way 🌌 to your nickname. I'm afraid you can't do this because your discord account is not connected to your EpicWeb.dev account. Go to <https://www.epicweb.dev/discord> to make that connection.

If you don't have an https://EpicWeb.dev account, you should check it out. It's pretty great 😉 🌌
			`.trim(),
		)
	})
}
