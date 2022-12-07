import * as Discord from 'discord.js'
import {
	getKcdOfficeHoursChannel,
	getMemberLink,
	getMessageLink,
	getReportsChannel,
	getTalkToBotsChannel,
} from '../utils'

type ReactionFn = {
	(message: Discord.MessageReaction): Promise<unknown>
	description?: string
}

const reactions: Record<string, ReactionFn> = {
	botask: ask,
	bothelp: help,
	botreport: report,
	botthread: thread,
	botdouble: doubleMessage,
	botdontasktoask: dontAskToAsk,
	botofficehours: officeHours,
	botcall: callKent,
	bottjssupport: tjssupport,
	boterdsupport: erdsupport,
} as const

async function help(messageReaction: Discord.MessageReaction) {
	void messageReaction.remove()
	const guild = messageReaction.message.guild
	if (!guild) return
	const helpRequester = messageReaction.users.cache.first()
	if (!helpRequester) return

	const botsChannel = getTalkToBotsChannel(guild)
	if (!botsChannel) return

	if (botsChannel.id !== messageReaction.message.channel.id) {
		botsChannel.send(
			`Hi ${helpRequester} 👋. You requested help in ${messageReaction.message.channel}. I'm here to help you.`,
		)
	}
	const guildEmojis = await guild.emojis.fetch()
	const reactionFields: Array<Discord.APIEmbedField> = []
	for (const [reactionName, { description }] of Object.entries(reactions)) {
		const emoji = guildEmojis.find(emoji => emoji.name === reactionName)
		reactionFields.push({
			name: emoji ? `${emoji} ${reactionName}` : reactionName,
			value: description || 'No description provided',
		})
	}

	await botsChannel.send({
		embeds: [
			{
				title: '🛎 Reactions Help',
				color: Discord.Colors.Orange,
				description: `Here are the available bot reactions:`,
				fields: reactionFields,
			},
		],
	})
}
help.description = 'Lists available bot reactions'

async function callKent(messageReaction: Discord.MessageReaction) {
	await messageReaction.message.reply(
		`
This looks like a great question for Kent's "Call Kent Podcast": https://kentcdodds.com/call

Simply create an account on kentcdodds.com, then go to <https://kentcdodds.com/calls/record/new> to record your question and Kent will answer when he gets the chance. Don't forget to subscribe to the podcast so you can hear the answer!
    `.trim(),
	)
	await messageReaction.remove()
}

async function officeHours(messageReaction: Discord.MessageReaction) {
	const message = messageReaction.message

	const guild = message.guild
	if (!guild) return

	const officeHoursChannel = getKcdOfficeHoursChannel(guild)
	if (!officeHoursChannel) return

	await message.reply(
		`If you don't get a satisfactory answer here, feel free to ask Kent in ${officeHoursChannel} and he'll do his best to answer during his <https://kcd.im/office-hours>. To do so, formulate your question to make sure it's clear (follow the guidelines in <https://kcd.im/ask>) and a <https://kcd.im/repro> helps a lot if applicable. Then post it to ${officeHoursChannel} or join the meeting and ask live. Kent streams/records his office hours on YouTube so even if you can't make it in person, you should be able to watch his answer later.`,
	)
	await messageReaction.remove()
}

async function dontAskToAsk(messageReaction: Discord.MessageReaction) {
	const message = messageReaction.message
	await message.reply(
		`We're happy to answer your questions if we can, so you don't need to ask if you can ask. Learn more: <https://dontasktoask.com>`,
	)
	await messageReaction.remove()
}

async function report(messageReaction: Discord.MessageReaction) {
	void messageReaction.remove()
	const guild = messageReaction.message.guild
	if (!guild) {
		console.error('could not find message reaction guild')
		return
	}
	const reporter = messageReaction.users.cache.first()
	if (!reporter) {
		console.error('could not find message reaction reporter')
		return
	}
	const message = messageReaction.message

	const offender = messageReaction.message.author
	if (!offender) {
		console.error('could not find message reaction offender')
		return
	}

	const reportsChannel = getReportsChannel(guild)
	if (!reportsChannel) {
		console.error('could not find message reaction reportsChannel')
		return
	}

	const moderatorsRole =
		(await guild.roles.fetch(process.env.ROLE_ID_MODERATORS)) ?? 'Moderators'

	const reportThread = await reportsChannel.threads.create({
		name: `🚨 Report on ${offender.username}`,
		autoArchiveDuration: Discord.ThreadAutoArchiveDuration.OneDay,
		invitable: true,
		type: Discord.ChannelType.GuildPublicThread,
	})

	await reportThread.send(
		`Hey ${moderatorsRole}. We need your attention on this report.`,
	)
	await reportThread.send({
		embeds: [
			{
				title: '🚨 User Report',
				color: Discord.Colors.Red,
				description: `A user has reported a message.`,
				author: {
					name: offender.username ?? 'Unknown',
					icon_url: offender.avatarURL() ?? offender.defaultAvatarURL,
					url: getMemberLink(offender),
				},
				fields: [
					{
						name: 'Message snippet',
						value: message.content?.slice(0, 100) || 'Unknown',
					},
					{
						name: 'Message Link',
						value: getMessageLink(message),
					},
					{
						name: 'Message Author ID',
						value: offender.toString(),
						inline: true,
					},
					{
						name: 'Reporter',
						value: reporter.toString(),
						inline: true,
					},
				],
			},
		],
	})
}
report.description = 'Reports a message to the server moderators to look at.'

async function ask(messageReaction: Discord.MessageReaction) {
	void messageReaction.remove()
	const reply = `Hi ${messageReaction.message.author} 👋\nWe appreciate your question and we'll do our best to help you when we can. Could you please give us more details? Please follow the guidelines in <https://kcd.im/ask> (especially the part about making a <https://kcd.im/repro>) and then we'll try to answer your question.`
	const { channel, author, guild, id } = messageReaction.message
	if (!guild || !channel || !author) return

	if (channel.type === Discord.ChannelType.GuildText) {
		const thread = await channel.threads.create({
			name: `🧵 Thread for ${author.username}`,
			startMessage: id,
		})
		await thread.send(reply)
		await thread.send(
			'Feel free to change the thread title to something more descriptive if you like.',
		)
	} else {
		await messageReaction.message.reply(reply)
	}
}
ask.description = `Creates a thread for the message and asks for more details about a question. Useful if you know the question needs more details, but you can't commit to replying when they come.`

async function doubleMessage(messageReaction: Discord.MessageReaction) {
	void messageReaction.remove()
	await messageReaction.message.reply(
		`Please avoid posting the same thing in multiple channels. Choose the best channel, and wait for a response there. Please delete the other message to avoid fragmenting the answers and causing confusion. Thanks!`,
	)
}
doubleMessage.description = `Replies to the message telling the user to avoid posting the same question in multiple channels.`

async function thread(messageReaction: Discord.MessageReaction) {
	void messageReaction.remove()
	const { channel, author, guild, id } = messageReaction.message
	if (!guild || !channel || !author) return

	if (channel.type === Discord.ChannelType.GuildText) {
		const thread = await channel.threads.create({
			name: `🧵 Thread for ${author.username}`,
			startMessage: id,
		})
		await thread.send(
			`Hi ${author} 👋\nLet's discuss this further here. Feel free to change the thread title to something more descriptive if you like.`,
		)
	}
}
thread.description = `Creates a thread for the message. Handy if you know the message needs a thread, but you can't commit to participating in the conversation so you don't want to be the one to create it.`

async function tjssupport(messageReaction: Discord.MessageReaction) {
	void messageReaction.remove()
	const { channel, author, guild } = messageReaction.message
	if (!guild || !channel || !author) return

	await channel.send(
		`Hi ${author} 👋\nFor support with TestingJavaScript.com, please email help@testingjavascript.com. Thanks!`,
	)
}
tjssupport.description = `Replies to the message telling the user to email TestingJavaScript.com support.`

async function erdsupport(messageReaction: Discord.MessageReaction) {
	void messageReaction.remove()
	const { channel, author, guild } = messageReaction.message
	if (!guild || !channel || !author) return

	await channel.send(
		`Hi ${author} 👋\nFor support with EpicReact.dev, please email team@epicreact.dev. Thanks!`,
	)
}
erdsupport.description = `Replies to the message telling the user to email EpicReact.dev support.`

export default reactions
