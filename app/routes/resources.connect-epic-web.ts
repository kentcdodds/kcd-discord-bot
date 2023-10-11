import { json, type DataFunctionArgs } from '@remix-run/node'
import { z } from 'zod'
import { ref } from '~/bot'
import { fetchKCDGuild, getErrorMessage } from '~/bot/utils'
import { validateUserPurchase } from '~/utils/epic.server'

const RequestSchema = z.object({
	deviceToken: z.string(),
	discordCode: z.string(),
	port: z.string().default('5639'),
	scope: z.string(),
})

export async function action({ request }: DataFunctionArgs) {
	const rawJson = await request.json()
	const result = RequestSchema.safeParse(rawJson)
	if (!result.success) {
		return json({ status: 'error', error: result.error.flatten() } as const, {
			status: 400,
		})
	}
	const { deviceToken, discordCode, port, scope } = result.data

	await validateUserPurchase({ deviceToken })

	const guild = await getGuild()
	if (!guild) return { status: 'error', error: 'KCD Guild not found' } as const

	const tokenResponse = await fetch(
		'https://discord.com/api/v10/oauth2/token',
		{
			method: 'POST',
			body: new URLSearchParams({
				client_id: process.env.DISCORD_APP_ID,
				client_secret: process.env.DISCORD_CLIENT_SECRET,
				code: discordCode,
				grant_type: 'authorization_code',
				redirect_uri: `http://localhost:${port}/discord/callback`,
				scope,
			}).toString(),
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
		},
	)
	if (!tokenResponse.ok) {
		console.error(await tokenResponse.text())
		return json(
			{ status: 'error', error: 'Error validating discord code' } as const,
			{ status: 400 },
		)
	}
	const oauthData = (await tokenResponse.json()) as any
	const userResponse = await fetch('https://discord.com/api/v10/users/@me', {
		headers: {
			authorization: `${oauthData.token_type} ${oauthData.access_token}`,
		},
	})
	if (!userResponse.ok) {
		console.error(await userResponse.text())
		return json(
			{
				status: 'error',
				error: 'Error retrieving user information with access token',
			} as const,
			{ status: 400 },
		)
	}

	const userData = (await userResponse.json()) as any

	await guild.members
		.add(userData.id, { accessToken: oauthData.access_token })
		.catch((e: any) => {
			console.error(`error adding user to guild, but maybe it's fine?`, e)
		})

	await guild.members.fetch(userData.id)
	const member = guild.members.cache.get(userData.id)
	if (!member) {
		return {
			status: 'error',
			error: `Member with ID ${userData.id} not found`,
		} as const
	}
	const epicWebRoleId = process.env.ROLE_ID_EPIC_WEB

	// handle missing permissions gracefully
	try {
		await member.roles.add(epicWebRoleId).catch((e: any) => {
			if (e?.message?.includes('Missing Permissions')) return
			throw e
		})
		await member.setNickname(`${member.displayName} 🌌`).catch((e: any) => {
			if (e?.message?.includes('Missing Permissions')) return
			throw e
		})
	} catch (error) {
		return json({ status: 'error', error: getErrorMessage(error) } as const, {
			status: 500,
		})
	}
	return json({
		status: 'success',
		member: {
			avatarURL: member.avatarURL,
			displayName: member.displayName,
			id: member.id,
		},
		oauthData,
	} as const)
}

async function getGuild() {
	const { client } = ref
	if (!client) {
		console.error('no client', ref)
		return null
	}

	const guild = await fetchKCDGuild(client)
	if (!guild) {
		console.error('KCD Guild not found')
		return null
	}
	return guild
}
