import { json, type DataFunctionArgs } from '@remix-run/node'
import type { ForumChannel, Guild } from 'discord.js'
import { ChannelType } from 'discord.js'
import { z } from 'zod'
import { ref } from '~/bot'
import { fetchKCDGuild } from '~/bot/utils'
import { LRUCache } from 'lru-cache'
import type { CacheEntry } from 'cachified'
import { cachified, lruCacheAdapter } from 'cachified'

const lru = new LRUCache<string, CacheEntry>({ max: 100 })
const cache = lruCacheAdapter(lru)

const EmojiDataSchema = z.union([
	z.object({
		emojiName: z.never().optional(),
		emojiUrl: z.string(),
	}),
	z.object({
		emojiName: z.string(),
		emojiUrl: z.never().optional(),
	}),
	z.object({
		emojiName: z.never().optional(),
		emojiUrl: z.never().optional(),
	}),
])

export const ThreadItemSchema = z.object({
	id: z.string(),
	tags: z.array(
		z
			.object({
				name: z.string(),
			})
			.and(EmojiDataSchema),
	),
	name: z.string(),
	link: z.string(),
	authorDisplayName: z.string(),
	authorHexAccentColor: z.string().nullable().optional(),
	authorAvatarUrl: z.string().nullable(),
	messagePreview: z.string(),
	messageCount: z.number(),
	lastUpdated: z.string(),
	previewImageUrl: z.string().nullable(),
	reactions: z.array(
		z
			.object({
				count: z.number(),
			})
			.and(EmojiDataSchema),
	),
})

const ThreadDataSchema = z.array(ThreadItemSchema)

type ThreadItem = z.infer<typeof ThreadItemSchema>

export async function action({ request }: DataFunctionArgs) {
	const reqUrl = new URL(request.url)

	const guild = await getGuild()
	if (!guild) {
		return json({ status: 'error', error: 'KCD Guild not found' } as const)
	}
	const channel = await guild.channels.fetch(
		process.env.CHANNEL_ID_EPIC_WEB_FORUM,
	)
	if (!channel || channel.type !== ChannelType.GuildForum) {
		return json(
			{
				status: 'error',
				error: 'Epic Web Forum Channel not found',
			} as const,
			{ status: 404 },
		)
	}

	const threadData = await getThreadData({
		guild,
		channel,
		forceFresh: reqUrl.searchParams.has('fresh'),
	})
	return json({ status: 'success', threadData } as const)
}

async function getThreadData({
	guild,
	channel,
	forceFresh,
}: {
	guild: Guild
	channel: ForumChannel
	forceFresh?: boolean
}) {
	return cachified({
		key: 'threadData',
		forceFresh,
		ttl: 1000 * 60,
		swr: 1000 * 60 * 5,
		cache,
		checkValue: ThreadDataSchema,
		async getFreshValue() {
			const fetchedThreads = await channel.threads.fetch()

			const archivedThreads =
				fetchedThreads.threads.size < 20
					? await channel.threads.fetch({
							archived: {
								fetchAll: true,
								type: 'public',
							},
					  })
					: null
			const allThreads = new Map([
				...fetchedThreads.threads.entries(),
				...(archivedThreads ? archivedThreads.threads.entries() : []),
			])

			const threadData: Array<ThreadItem> = []

			const guildEmojis = await guild.emojis.fetch()

			for (const [id, thread] of allThreads.entries()) {
				const { name, messages } = thread

				const tags = thread.appliedTags
					.map(tagId => {
						const tag = channel.availableTags.find(tag => tag.id === tagId)
						if (!tag) return null
						if (tag.emoji) {
							const { emoji } = tag
							const guildEmoji = guildEmojis.find(ge => ge.id === emoji.id)
							if (guildEmoji) {
								return { name: tag.name, emojiUrl: guildEmoji.url }
							} else if (emoji.name) {
								return { name: tag.name, emojiName: emoji.name }
							}
						}
						return { name: tag.name }
					})
					.filter(Boolean)

				const starterMessage = await thread.fetchStarterMessage()
				if (!starterMessage) {
					console.error('no message found for thread', thread)
					continue
				}
				const { content, attachments, embeds, reactions } = starterMessage
				const author = await starterMessage.author.fetch()
				const previewImageUrl =
					attachments.first()?.url ?? embeds?.[0]?.image?.url ?? null
				const authorDisplayName =
					author.displayName ?? author.username ?? 'Unknown User'

				const messagePreview =
					content.length > 100 ? `${content.slice(0, 100)}...` : content
				const reactionData = reactions.cache.map(reaction => {
					const { emoji } = reaction
					if (emoji.id) {
						if (emoji.url) {
							return { count: reaction.count, emojiUrl: emoji.url }
						}
					}
					if (emoji.name) {
						return { count: reaction.count, emojiName: emoji.name }
					} else {
						return { count: reaction.count }
					}
				})

				threadData.push({
					id,
					tags,
					name,
					link: thread.url,
					authorDisplayName,
					authorHexAccentColor: author.hexAccentColor,
					authorAvatarUrl: author.avatarURL(),
					messagePreview,
					messageCount: thread.messageCount ?? messages.cache.size,
					lastUpdated: messages.cache.last()?.createdAt.toISOString() ?? '',
					previewImageUrl,
					reactions: reactionData,
				})
			}
			return threadData
		},
	})
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
