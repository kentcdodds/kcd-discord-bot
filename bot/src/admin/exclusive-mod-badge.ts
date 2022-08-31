import type * as TDiscord from 'discord.js'
import { isModerator } from '../utils/roles'
import { getMember, getTalkToBotsChannel } from './utils'

async function handleGuildMemberUpdate(
	oldMember: TDiscord.GuildMember | TDiscord.PartialGuildMember,
	newMember: TDiscord.GuildMember,
) {
	const oldHasModRole = isModerator(oldMember)
	const newHasModRole = isModerator(newMember)
	const isNewMod = newHasModRole && !oldHasModRole
	if (isNewMod) {
		await newMember.setNickname(`${newMember.displayName} ◆`)
		return
	}
	return handleMember(newMember)
}

async function handleMember(member: TDiscord.GuildMember | undefined | null) {
	if (!member) return
	const hasBadge = member.nickname?.includes('◆')
	if (hasBadge && !isModerator(member)) {
		await member.setNickname(member.displayName.replace(/◆/g, '').trim())
		const botsChannel = getTalkToBotsChannel(member.guild)
		if (!botsChannel) return
		await botsChannel.send(
			`
Hi ${member.user}, I noticed you added "◆" to your nickname. I'm afraid you can't do this because it's reserved for Moderators, so I've removed it.
      `.trim(),
		)
	}
}

async function handleNewMessage(message: TDiscord.Message) {
	return handleMember(getMember(message.guild, message.author.id))
}

export { handleGuildMemberUpdate, handleNewMessage }
