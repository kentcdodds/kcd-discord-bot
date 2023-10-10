import { json, type DataFunctionArgs } from '@remix-run/node'
import { z } from 'zod'
import { ref } from '~/bot'
import { fetchKCDGuild, getErrorMessage } from '~/bot/utils'

const RequestSchema = z.object({
	deviceToken: z.string(),
	discordCode: z.string(),
	port: z.string().default('5639'),
	scope: z.string(),
})

const UserInfoSchema = z.object({
	id: z.string(),
	email: z.string(),
	purchases: z.array(
		z.object({
			id: z.string(),
			status: z.string(),
			productId: z.string(),
		}),
	),
})

const epicWebProductIds = ['kcd_product-f000186d-78c2-4b02-a763-85b2e5feec7b']

export async function action({ request }: DataFunctionArgs) {
	const guild = await getGuild()
	if (!guild) return { status: 'error', error: 'KCD Guild not found' } as const

	const rawJson = await request.json()
	const result = RequestSchema.safeParse(rawJson)
	if (!result.success) {
		return json({ status: 'error', error: result.error.flatten() } as const, {
			status: 400,
		})
	}
	const { deviceToken, discordCode, port, scope } = result.data
	const userInfoResponse = await fetch(
		'https://www.epicweb.dev/oauth/userinfo',
		{ headers: { authorization: `Bearer ${deviceToken}` } },
	)
	if (!userInfoResponse.ok) {
		return json(
			{ status: 'error', error: 'Error validating device token' } as const,
			{ status: 400 },
		)
	}
	const userInfoResult = UserInfoSchema.safeParse(await userInfoResponse.json())
	if (!userInfoResult.success) {
		console.error(
			'Error parsing userInfo API response',
			userInfoResult.error.flatten(),
		)
		return json(
			{
				status: 'error',
				error: 'Error parsing userInfo API Response',
				details: userInfoResult.error.flatten(),
			} as const,
			{ status: 400 },
		)
	}
	const hasPurchase = userInfoResult.data.purchases.some(p =>
		epicWebProductIds.includes(p.productId),
	)
	if (!hasPurchase) {
		return json(
			{ status: 'error', error: 'No purchase found for this user' } as const,
			{ status: 400 },
		)
	}
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
	const oauthData = await tokenResponse.json()
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

	const userData = await userResponse.json()

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
		return
	}

	const guild = await fetchKCDGuild(client)
	if (!guild) {
		console.error('KCD Guild not found')
		return
	}
	return guild
}
