import { json } from '@remix-run/node'
import { z } from 'zod'

const UserInfoSchema = z.object({
	id: z.string(),
	email: z.string(),
	purchases: z.array(
		z.object({
			id: z.string(),
			status: z.literal('Valid'),
			productId: z.string(),
		}),
	),
})

const epicWebProductIds = [
	'kcd_product_dbf94bf0-66b0-11ee-8c99-0242ac120002', // Full Stack Vol 1
	'1b6e7ed6-8a15-48f1-8dd7-e76612581ee8', // Pixel Perfect Figma to Tailwind
	'776463e4-7758-494d-b0f5-eb7cbd62e518', // Mocking Techniques in Vitest
	'7872d512-ba34-4108-b510-7db9cbcee98c', // Testing Fundamentals
	'cbffba30-0d05-4376-9d95-3f906ae272b9', // Epic React Workshop Series
	'172870b5-73ef-4551-b3f5-93f90a2cd93b', // Testing Fundamentals in TypeScript
	'0143b3f6-d5dd-4f20-9898-38da609799ca', // Authentication Strategies & Implementation
	'dc9b750c-e3bc-4b0a-b7d2-d04a481afa0d', // Full Stack Foundations
	'2267e543-51fa-4d71-a02f-ad9ba71a1f8e', // Data Modeling Deep Dive
	'5ffdd0ef-a7a3-431e-b36b-f4232da7e454', // Professional Web Forms
	'2e5b2993-d069-4e43-a7f1-24cffa83f7ac', // Web Application Testing
]

const epicReactProductIds = [
	'kcd_product-clzlrf0g5000008jm0czdanmz', // Epic React Pro
	'kcd_product_15d22ad4-b668-4e81-bb5a', // Epic React Standard
	'kcd_product_b394271c-d6d6-4403', // Epic React Basic
]

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
		throw json(
			{
				status: 'error',
				error: 'Error parsing userInfo API Response',
				details: userInfoResult.error.flatten(),
			} as const,
			{ status: 400 },
		)
	}

	const hasEpicWebPurchase = userInfoResult.data.purchases.some(p =>
		epicWebProductIds.includes(p.productId),
	)
	const hasEpicReactPurchase = userInfoResult.data.purchases.some(p =>
		epicReactProductIds.includes(p.productId),
	)

	if (!hasEpicWebPurchase && !hasEpicReactPurchase) {
		throw json(
			{ status: 'error', error: 'No purchase found for this user' } as const,
			{ status: 400 },
		)
	}

	return {
		hasEpicWebPurchase,
		hasEpicReactPurchase,
	}
}
