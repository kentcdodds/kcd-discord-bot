import type * as TDiscord from 'discord.js'
import * as dedupeMessages from './dedupe'
import * as selfDestruct from './cleanup-self-destruct-messages'
import * as exclusiveModBadge from './exclusive-mod-badge'
import * as exclusiveEpicWebStars from './exclusive-epic-web-stars'
import * as exclusiveEpicReactRocket from './exclusive-epic-react-rocket'
import * as exclusiveTestingJSTrophy from './exclusive-testing-js-trophy'
import * as exclusiveEpicAiLightning from './exclusive-epic-ai-lightning'
import * as postCleanup from './post-cleanup'
import * as welcome from './welcome'
import * as helpJoining from './help-joining'

function setup(client: TDiscord.Client) {
	dedupeMessages.setup(client)
	selfDestruct.setup(client)
	exclusiveModBadge.setup(client)
	exclusiveEpicWebStars.setup(client)
	exclusiveEpicReactRocket.setup(client)
	exclusiveTestingJSTrophy.setup(client)
	exclusiveEpicAiLightning.setup(client)
	postCleanup.setup(client)
	welcome.setup(client)
	helpJoining.setup(client)
}

export { setup }
