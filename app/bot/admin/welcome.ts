import * as Discord from 'discord.js'
import { getMemberTeam, isMember } from '../utils/roles'
import {
	botLog,
	getBotLogChannel,
	getErrorMessage,
	getHowToJoinChannel,
	getIntroductionsChannel,
	getMemberLink,
	getTipsChannel,
} from './utils'

const colors = {
	BLUE: Discord.Colors.Blue,
	RED: Discord.Colors.Red,
	YELLOW: Discord.Colors.Yellow,
	UNASSIGNED: Discord.Colors.NotQuiteBlack,
}

const emoji = {
	BLUE: '🔵',
	RED: '🔴',
	YELLOW: '🟡',
	UNASSIGNED: '⚫',
}

export function setup(client: Discord.Client) {
	client.on('guildMemberAdd', async member => {
		if (isMember(member)) {
			await welcomeNewMember(member)
		} else {
			await greetVisitor(member)
			void updateOnboardingBotLog(member, () =>
				getBotLogEmbed(member, {
					fields: [{ name: 'Status', value: `onboarding`, inline: true }],
				}),
			)
		}
	})

	client.on('guildMemberUpdate', async (oldMember, member) => {
		const oldHasMemberRole = isMember(oldMember)
		const newHasMemberRole = isMember(member)
		const oldMemberTeam = getMemberTeam(oldMember)
		const newMemberTeam = getMemberTeam(member)
		const isNewMember = newHasMemberRole && !oldHasMemberRole

		if (isNewMember) {
			member = await member.fetch()
			return welcomeNewMember(member)
		}
		if (oldMemberTeam !== newMemberTeam) {
			void updateOnboardingBotLog(member, () => {
				const memberTeam = getMemberTeam(member)
				return getBotLogEmbed(member, {
					color: colors[memberTeam],
					fields: [
						{ name: 'Status', value: `connected`, inline: true },
						{
							name: 'Team',
							value: `${memberTeam} ${emoji[memberTeam]}`,
							inline: true,
						},
					],
				})
			})
		}
	})
}

async function greetVisitor(member: Discord.GuildMember) {
	const introductions = getIntroductionsChannel(member.guild)
	if (!introductions) return

	const howToJoin = getHowToJoinChannel(member.guild)

	const catjam =
		member.guild.emojis.cache.find(({ name }) => name === 'catjam') ?? '😎'

	const thread = await ensureMemberWelcomeThread(member, introductions)
	await thread.send(
		`
Why hello there ${member}! 👋 You've found the Epic Web Discord server. It's a pretty sweet place ${catjam}

I'm the Epic Web Bot 🤖 and I'm here to help you get going. The channel list probably looks a bit small at the moment. This is because you need to first connect your kentcdodds.com account with your discord account (as explained in ${howToJoin}). Simply go to <https://kentcdodds.com/me> (take a minute to setup an account if you don't have one already) and click the "Connect Discord" link. Once you've done that, you'll be able to see all the channels and you'll be able to introduce yourself in ${introductions}.

Once you're finished, I'll ping you again with some more info about the server. I'll be waiting here ${thread} 👋

P.S. If you can't do that at the moment, that's fine. Just come back later and I'll be here.
	`.trim(),
	)
}

async function welcomeNewMember(member: Discord.GuildMember) {
	const introductions = getIntroductionsChannel(member.guild)
	if (!introductions) return

	const tips = getTipsChannel(member.guild)
	if (!tips) return

	const thread = await ensureMemberWelcomeThread(member, introductions)
	await thread.send(
		`
Hooray ${member}! You are now a member of the Epic Web Discord server!

I'm your friendly robot 🤖. To learn more about me, go ahead and run the command \`/help\` and I'll tell you all about myself.

I'd suggest you checkout ${tips} to learn more about the server and how to get the most out of it.

We'd love to get to know you. Why don't you introduce yourself in ${introductions}? Here's a template you can use for starters:
		`.trim() + '\n',
	)
	await thread.send(
		`
🌐 I'm from: 
🏢 I work at: 
💻 I work with this tech: 
🍎 I snack on: 
🤪 I really enjoy:
		`.trim() + ' \n',
	)
	await thread.send('We hope you enjoy your time here! 🎉')
	void updateOnboardingBotLog(member, () => {
		const memberTeam = getMemberTeam(member)
		return getBotLogEmbed(member, {
			color: colors[memberTeam],
			fields: [
				{ name: 'Status', value: `onboarded`, inline: true },
				{
					name: 'Team',
					value: `${memberTeam} ${emoji[memberTeam]}`,
					inline: true,
				},
				{ name: 'Welcome channel', value: `${thread}`, inline: true },
			],
		})
	})
}

async function ensureMemberWelcomeThread(
	member: Discord.GuildMember,
	introductionsChannel: Discord.TextChannel,
) {
	const threadName = `Welcome ${member.user.username} 👋`
	await introductionsChannel.threads.fetch()
	const threads = introductionsChannel.threads.cache.filter(
		t => t.name === threadName,
	)
	let thread: Discord.ThreadChannel | undefined
	for (const [, t] of threads) {
		await t.members.fetch()
		if (t.members.cache.has(member.id)) {
			thread = t
			break
		}
	}
	if (thread) return thread

	const canMakePrivateThreads = [
		Discord.GuildPremiumTier.Tier2,
		Discord.GuildPremiumTier.Tier3,
	].includes(member.guild.premiumTier)

	const newThread = await introductionsChannel.threads.create({
		type: canMakePrivateThreads
			? Discord.ChannelType.GuildPrivateThread
			: Discord.ChannelType.GuildPublicThread,
		autoArchiveDuration: Discord.ThreadAutoArchiveDuration.OneHour,
		name: threadName,
		reason: `${member.user.username} joined the server`,
	})

	await newThread.members.add(member)

	return newThread
}

function getBotLogEmbed(
	member: Discord.GuildMember,
	{ author, fields = [], ...overrides }: Partial<Discord.APIEmbed>,
): Discord.APIEmbed {
	const embed: Discord.APIEmbed = {
		title: '👋 New Member',
		author: {
			name: member.displayName,
			icon_url: member.user.avatarURL() ?? member.user.defaultAvatarURL,
			url: getMemberLink(member),
			...author,
		},
		color: Discord.Colors.White,
		description: `${member} has joined the server.`,
		fields: [{ name: 'Member ID', value: member.id, inline: true }, ...fields],
		...overrides,
	}
	return embed
}

function updateOnboardingBotLog(
	member: Discord.GuildMember,
	updatedEmbed: () => Discord.APIEmbed,
) {
	let botLogMessage
	try {
		const botsChannel = getBotLogChannel(member.guild)
		if (!botsChannel) return

		botLogMessage = botsChannel.messages.cache.find(msg =>
			msg.embeds.some(embd => {
				if (!embd.title || !/New Member/i.test(embd.title)) return false

				return embd.fields.find(field => {
					return /Member ID/i.test(field.name) && field.value === member.id
				})
			}),
		)
	} catch (error: unknown) {
		// ignore errors for logs...
		console.error(
			`Error trying to get the botLogMessage to update`,
			getErrorMessage(error),
		)
	}
	if (botLogMessage) {
		try {
			return botLogMessage.edit({ embeds: [updatedEmbed()] })
		} catch {
			// ignore
		}
	} else {
		return botLog(member.guild, updatedEmbed)
	}
}
