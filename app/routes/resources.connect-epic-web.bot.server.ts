import { json, type DataFunctionArgs } from '@remix-run/node'
import { z } from 'zod'
import { ref } from '~/bot'
import { fetchKCDGuild } from '~/bot/utils'

const RequestSchema = z.object({
	deviceToken: z.string(),
	discordCode: z.string(),
	port: z.number().default(5639),
})

export async function action({ request }: DataFunctionArgs) {
	const rawJson = await request.json()
	const result = RequestSchema.safeParse(rawJson)
	if (!result.success) {
		return json({ status: 'error', error: result.error.flatten() } as const, {
			status: 400,
		})
	}
	const { deviceToken, discordCode, port } = result.data
	const response = await fetch('https://www.epicweb.dev/api/progress', {
		headers: { authorization: `Bearer ${deviceToken}` },
	})
	if (!response.ok) {
		return json(
			{ status: 'error', error: 'Error validating device token' } as const,
			{ status: 400 },
		)
	}
	const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
		method: 'POST',
		body: new URLSearchParams({
			client_id: process.env.DISCORD_APP_ID,
			client_secret: process.env.DISCORD_CLIENT_SECRET,
			code: discordCode,
			grant_type: 'authorization_code',
			redirect_uri: `http://localhost:${port}`,
			scope: 'identify',
		}).toString(),
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
	})
	const oauthData = await tokenResponse.json()
	const userResponse = await fetch('https://discord.com/api/users/@me', {
		headers: {
			authorization: `${oauthData.token_type} ${oauthData.access_token}`,
		},
	})

	const userData = await userResponse.json()
	const addRoleResult = await addEpicWebRoleToUser(userData.id)
	if (addRoleResult.status === 'success') {
		return json({
			status: 'success',
			member: {
				avatarURL: addRoleResult.member.avatarURL,
				displayName: addRoleResult.member.displayName,
				id: addRoleResult.member.id,
			},
		} as const)
	} else {
		return json(addRoleResult, { status: 500 })
	}
}

export async function addEpicWebRoleToUser(userId: string) {
	const guild = await getGuild()
	if (!guild) return { status: 'error', error: 'KCD Guild not found' } as const
	const epicWebRoleId = process.env.ROLE_ID_EPIC_WEB
	await guild.members.fetch(userId)
	const member = guild.members.cache.get(userId)
	if (!member) return { status: 'error', error: 'Member not found' } as const
	await member.roles.add(epicWebRoleId)
	await member.setNickname(`${member.displayName} 🌌`)
	return { status: 'success', member } as const
}

async function getGuild() {
	const { client } = ref
	if (!client) {
		console.error('no client', ref)
		return
	}

	const guild = await fetchKCDGuild(client)
	if (!guild) {
		console.error('KCD Guild not found')
		return
	}
	return guild
}
