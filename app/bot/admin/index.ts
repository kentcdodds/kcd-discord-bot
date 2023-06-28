import type * as TDiscord from 'discord.js'
import * as dedupeMessages from './dedupe'
import * as selfDestruct from './cleanup-self-destruct-messages'
import * as exclusiveModBadge from './exclusive-mod-badge'
import * as exclusiveEpicWebStars from './exclusive-epic-web-stars'
import * as exclusiveEpicReactRocket from './exclusive-epic-react-rocket'
import * as exclusiveTestingJSTrophy from './exclusive-testing-js-trophy'
import * as welcome from './welcome'

function setup(client: TDiscord.Client) {
	dedupeMessages.setup(client)
	selfDestruct.setup(client)
	exclusiveModBadge.setup(client)
	exclusiveEpicWebStars.setup(client)
	exclusiveEpicReactRocket.setup(client)
	exclusiveTestingJSTrophy.setup(client)
	welcome.setup(client)
}

export { setup }
