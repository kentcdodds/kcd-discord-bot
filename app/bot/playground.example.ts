import 'dotenv/config'
import * as env from '../utils/env.server'
import * as bot from '.'
import { installGlobals } from '@remix-run/node/dist/globals'

installGlobals()

env.init()

bot.start()
