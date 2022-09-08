import type * as TDiscord from 'discord.js'
import { isTestingJs } from '../utils/roles'
import { getTalkToBotsChannel } from './utils'

export function setup(client: TDiscord.Client) {
	client.on('guildMemberUpdate', async (oldMember, member) => {
		const oldHasTJSRole = isTestingJs(oldMember)
		const newHasTJSRole = isTestingJs(member)
		const isNewTJS = newHasTJSRole && !oldHasTJSRole

		if (isNewTJS) {
			await member.setNickname(`${member.displayName} 🏆`)
			return
		}

		if (newHasTJSRole) return

		const hasTrophy = member.nickname?.includes('🏆')
		if (!hasTrophy) return

		await member.setNickname(member.displayName.replace(/🏆/g, '').trim())

		const botsChannel = getTalkToBotsChannel(member.guild)
		await botsChannel?.send(
			`
Hi ${member.user}, I noticed you added a trophy 🏆 to your nickname. I'm afraid you can't do this because your discord account is not connected to your TestingJavaScript.com account. Login to <https://TestingJavaScript.com> and click the link at the top to make that connection.

If you don't have an https://TestingJavaScript.com account, you should check it out. It's pretty great 😉 🏆
			`.trim(),
		)
	})
}
