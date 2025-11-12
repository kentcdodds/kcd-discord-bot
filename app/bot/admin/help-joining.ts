import * as Discord from 'discord.js'
import { isModerator } from '../utils/roles'
import {
	botLog,
	getErrorMessage,
	getHowToJoinChannel,
	getMessageLink,
} from './utils'

const threadArchiveDuration = Discord.ThreadAutoArchiveDuration.OneDay

export function setup(client: Discord.Client) {
	client.on('messageCreate', async message => {
		try {
			await handleHelpJoiningMessage(message)
		} catch (error) {
			const guild = message.guild
			if (!guild) return
			void botLog(guild, () => ({
				title: '⚠️ Help-Joining handler error',
				color: Discord.Colors.Red,
				description: getErrorMessage(error),
			}))
		}
	})
}

async function handleHelpJoiningMessage(
	message: Discord.Message | Discord.PartialMessage,
) {
	if (message.partial) {
		try {
			message = await message.fetch()
		} catch {
			return
		}
	}

	const { guild, channel, author, content } = message
	if (!guild) return
	if (!channel?.isTextBased()) return
	if (channel.id !== process.env.CHANNEL_ID_HELP_JOINING) return
	if (author.id === message.client.user?.id) return
	if (author.bot) return

	let member = message.member ?? guild.members.cache.get(author.id)
	if (!member) {
		try {
			member = await guild.members.fetch({ user: author.id })
		} catch {
			return
		}
	}
	if (isModerator(member)) return
	if (channel.type !== Discord.ChannelType.GuildText) return

	const helpThread = await ensureMemberHelpThread(channel, member)
	const howToJoin = getHowToJoinChannel(guild)

	const reminderPieces = [
		`Hey ${author}, thanks for reaching out! I removed your message here to keep things tidy.`,
		`Please finish the onboarding steps in ${
			howToJoin ?? '#how-to-join'
		} so you can see the rest of the server.`,
		`If you run into trouble, email Kent at me@kentcdodds.com with the details of the problem and which step you're stuck on.`,
		`I'll keep this thread open until you finish onboarding—reply here if you need more help.`,
	]

	await helpThread.send(reminderPieces.join('\n\n'))

	const messageLink = getMessageLink(message)
	const deletedContent = content?.trim() ? content : '(no content)'
	const attachments = [...message.attachments.values()]
	const attachmentsSummary =
		attachments.length > 0
			? attachments.map(attachment => attachment.url).join('\n')
			: null

	await message.delete()

	void botLog(guild, () => ({
		title: '🧹 Cleared help-joining message',
		color: Discord.Colors.Orange,
		description: [
			`Deleted a message from ${author} in ${channel}.`,
			`Thread: ${helpThread}`,
			`Original message link: <${messageLink}>`,
		].join('\n'),
		fields: [
			{
				name: 'Message Content',
				value:
					deletedContent.length > 1024
						? `${deletedContent.slice(0, 1021)}...`
						: deletedContent,
				inline: false,
			},
			attachmentsSummary
				? {
						name: 'Attachments',
						value: attachmentsSummary.slice(0, 1024),
						inline: false,
				  }
				: null,
		].filter(Boolean),
	}))
}

async function ensureMemberHelpThread(
	channel: Discord.TextChannel,
	member: Discord.GuildMember,
) {
	await channel.threads.fetch()
	await channel.threads.fetchArchived({ type: 'private' }).catch(() => {})
	await channel.threads.fetchArchived({ type: 'public' }).catch(() => {})

	const threadName = `Help ${member.user.username}`
	let thread = channel.threads.cache.find(
		currentThread =>
			currentThread.name === threadName &&
			[
				Discord.ChannelType.PrivateThread,
				Discord.ChannelType.PublicThread,
			].includes(currentThread.type),
	)

	if (!thread) {
		const canMakePrivateThreads = [
			Discord.GuildPremiumTier.Tier2,
			Discord.GuildPremiumTier.Tier3,
		].includes(member.guild.premiumTier)

		thread = await channel.threads.create({
			autoArchiveDuration: threadArchiveDuration,
			name: threadName,
			type: canMakePrivateThreads
				? Discord.ChannelType.PrivateThread
				: Discord.ChannelType.PublicThread,
			reason: `Help joining instructions for ${member.user.tag}`,
		})
	} else if (thread.archived) {
		await thread.setArchived(false, 'Need to remind member about onboarding')
	}

	await thread.members.fetch()
	if (!thread.members.cache.has(member.id)) {
		await thread.members.add(member.id).catch(() => {})
	}

	return thread
}
