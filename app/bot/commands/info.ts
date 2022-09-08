import * as Discord from 'discord.js'
import { getBuildTimeInfo, getCommitInfo, getStartTimeInfo } from '../utils'
import type { CommandFn } from './utils'

export const info: CommandFn = async interaction => {
	const commitInfo = getCommitInfo()
	await interaction.reply({
		ephemeral: true,
		embeds: [
			{
				title: 'ℹ️ Bot info',
				color: Discord.Colors.Blue,
				description: `Here's some info about the currently running bot:`,
				fields: [
					...(commitInfo
						? [
								{ name: 'Commit Author', value: commitInfo.author },
								{ name: 'Commit Date', value: commitInfo.date },
								{ name: 'Commit Message', value: commitInfo.message },
								{ name: 'Commit Link', value: commitInfo.link },
						  ]
						: [{ name: 'Commit Info', value: 'Unavailable' }]),
					{ name: 'Started at', value: getStartTimeInfo() },
					{ name: 'Built at', value: getBuildTimeInfo() },
				],
			},
		],
	})
}
info.description = 'Get info about the currently running bot.'
