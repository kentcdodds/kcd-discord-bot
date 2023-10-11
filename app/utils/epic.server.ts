import { json } from '@remix-run/node'
import { z } from 'zod'

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

export async function validateUserPurchase({
	deviceToken,
}: {
	deviceToken: string
}) {
	const userInfoResponse = await fetch(
		'https://www.epicweb.dev/oauth/userinfo',
		{ headers: { authorization: `Bearer ${deviceToken}` } },
	)
	if (!userInfoResponse.ok) {
		throw json(
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
}
