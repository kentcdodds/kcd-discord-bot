const path = require('path')
const { SlashCommandBuilder } = require('@discordjs/builders')
const { REST } = require('@discordjs/rest')
const { Routes } = require('discord-api-types/v9')
const invariant = require('tiny-invariant')
const dotenv = require('dotenv')

dotenv.config({ path: path.join(__dirname, '../.env') })

const { DISCORD_BOT_TOKEN, KCD_GUILD_ID, DISCORD_APP_ID } = process.env

invariant(DISCORD_BOT_TOKEN, 'DISCORD_BOT_TOKEN is required')
invariant(KCD_GUILD_ID, 'KCD_GUILD_ID is required')
invariant(DISCORD_APP_ID, 'DISCORD_APP_ID is required')

const commands = [
	new SlashCommandBuilder()
		.setName('info')
		.setDescription('Replies with KCD bot info.'),
	new SlashCommandBuilder()
		.setName('help')
		.setDescription('Replies with KCD bot help.'),
	new SlashCommandBuilder()
		.setName('kif')
		.setDescription('Posts a kif.')
		.addStringOption(option =>
			option
				.setName('name')
				.setDescription('The name or alias of the kif.')
				.setRequired(true)
				.setAutocomplete(true),
		)
		.addUserOption(option =>
			option
				.setName('user')
				.setDescription('A user to post the kif to.')
				.setRequired(false),
		),
	new SlashCommandBuilder()
		.setName('search')
		.setDescription(`Search Kent's content.`)
		.addStringOption(option =>
			option
				.setName('query')
				.setDescription('Your search query.')
				.setRequired(true)
				.setAutocomplete(true),
		)
		.addUserOption(option =>
			option
				.setName('user')
				.setDescription('A user to share the result with.')
				.setRequired(false),
		),
].map(command => command.toJSON())

const rest = new REST({ version: '9' }).setToken(DISCORD_BOT_TOKEN)

rest
	.put(Routes.applicationGuildCommands(DISCORD_APP_ID, KCD_GUILD_ID), {
		body: commands,
	})
	.then(() => console.log('Successfully registered application commands.'))
	.catch(console.error)
