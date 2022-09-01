import * as Discord from 'discord.js'
import * as Sentry from '@sentry/node'
import * as commands from './commands'
import * as reactions from './reactions'
import * as admin from './admin'
import {
	botLog,
	colors,
	getBuildTimeInfo,
	getCommitInfo,
	getStartTimeInfo,
	typedBoolean,
} from './utils'

export async function start() {
	const client = new Discord.Client({
		intents: [
			Discord.Intents.FLAGS.GUILDS,
			Discord.Intents.FLAGS.GUILD_MEMBERS,
			Discord.Intents.FLAGS.GUILD_MESSAGES,
			Discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
		],
	})

	// setup all parts of the bot here
	commands.setup(client)
	reactions.setup(client)
	admin.setup(client)

	Sentry.captureMessage('Logging in client')
	void client.login(process.env.DISCORD_BOT_TOKEN)

	client.on('ready', () => {
		Sentry.captureMessage('Client logged in.')

		const guild = client.guilds.cache.find(
			({ id }) => id === process.env.KCD_GUILD_ID,
		)
		if (guild && process.env.NODE_ENV === 'production') {
			void botLog(guild, () => {
				const commitInfo = getCommitInfo()
				const commitValue = commitInfo
					? [
							`author: ${commitInfo.author}`,
							`date: ${commitInfo.date}`,
							`message: ${commitInfo.message}`,
							`link: <${commitInfo.link}>`,
					  ].join('\n')
					: null
				return {
					title: '🤖 BOT Started',
					color: colors.base0B,
					description: `Logged in and ready to go. Here's some info on the running bot:`,
					fields: [
						{ name: 'Startup', value: getStartTimeInfo(), inline: true },
						{ name: 'Built', value: getBuildTimeInfo(), inline: true },
						commitValue ? { name: 'Commit', value: commitValue } : null,
					].filter(typedBoolean),
				}
			})
		}
	})

	return async function cleanup() {
		Sentry.captureMessage('Client logging out')
		client.destroy()
	}
}
