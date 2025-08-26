import type * as TDiscord from 'discord.js'
import { isEpicAi } from '../utils/roles'
import { getTalkToBotsChannel } from './utils'

export function setup(client: TDiscord.Client) {
	client.on('guildMemberUpdate', async (oldMember, member) => {
		const oldHasEpicAiRole = isEpicAi(oldMember)
		const newHasEpicAiRole = isEpicAi(member)
		const isNewEpicAi = newHasEpicAiRole && !oldHasEpicAiRole
		const hasLightning = member.nickname?.includes('⚡')

		if (isNewEpicAi && !hasLightning) {
			await member.setNickname(`${member.displayName} ⚡`)
			return
		}

		if (newHasEpicAiRole) return

		if (!hasLightning) return

		await member.setNickname(member.displayName.replace(/⚡/g, '').trim())

		const botsChannel = getTalkToBotsChannel(member.guild)
		await botsChannel?.send(
			`
Hi ${member.user}, I noticed you added a lightning bolt ⚡ to your nickname. I'm afraid you can't do this because your discord account is not connected to your EpicAI.pro account. Go to <https://epicai.pro/discord> to make that connection.

If you don't have an https://EpicAI.pro account, you should check it out. It's pretty great 😉 ⚡
			`.trim(),
		)
	})
}
