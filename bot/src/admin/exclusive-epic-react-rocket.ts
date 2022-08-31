import type * as TDiscord from 'discord.js'
import { isEpicReactDev } from '../utils/roles'
import { getMember, getTalkToBotsChannel } from './utils'

async function handleGuildMemberUpdate(
	oldMember: TDiscord.GuildMember | TDiscord.PartialGuildMember,
	newMember: TDiscord.GuildMember,
) {
	return handleMember(newMember)
}

async function handleMember(member: TDiscord.GuildMember | undefined | null) {
	if (!member) return
	const hasRocket = member.nickname?.includes('🚀')

	if (hasRocket && !isEpicReactDev(member)) {
		await member.setNickname(member.displayName.replace(/🚀/g, '').trim())
		const botsChannel = getTalkToBotsChannel(member.guild)
		if (!botsChannel) return
		await botsChannel.send(
			`
Hi ${member.user}, I noticed you added a rocket 🚀 to your nickname. I'm afraid you can't do this because your discord account is not connected to your EpicReact.Dev account. Go to <https://epicreact.dev/discord> to make that connection.

If you don't have an https://EpicReact.Dev account, you should check it out. It's pretty great 😉 🚀
      `.trim(),
		)
	}
}

async function handleNewMessage(message: TDiscord.Message) {
	return handleMember(getMember(message.guild, message.author.id))
}

export { handleGuildMemberUpdate, handleNewMessage }
