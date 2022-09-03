import * as Sentry from '@sentry/node'

// unfortunately TypeScript doesn't have Intl.ListFormat yet 😢
// so we'll just add it ourselves:
type ListFormatOptions = {
	type?: 'conjunction' | 'disjunction' | 'unit'
	style?: 'long' | 'short' | 'narrow'
	localeMatcher?: 'lookup' | 'best fit'
}
// I don't know how to make this work without a namespace
// eslint-disable-next-line @typescript-eslint/no-namespace
declare namespace Intl {
	class ListFormat {
		constructor(locale: string, options: ListFormatOptions)
		public format: (items: Array<string>) => string
	}
}
type ListifyOptions<ItemType> = {
	type?: ListFormatOptions['type']
	style?: ListFormatOptions['style']
	stringify?: (item: ItemType) => string
}
function listify<ItemType extends { toString(): string }>(
	array: Array<ItemType>,
	{
		type = 'conjunction',
		style = 'long',
		stringify = (thing: { toString(): string }) => thing.toString(),
	}: ListifyOptions<ItemType> = {},
) {
	const stringified = array.map(item => stringify(item))
	const formatter = new Intl.ListFormat('en', { style, type })
	try {
		return formatter.format(stringified)
	} catch (error: unknown) {
		Sentry.captureMessage(
			`Trouble formatting this: ${JSON.stringify(stringified)}`,
		)
		throw error
	}
}
export { listify }
