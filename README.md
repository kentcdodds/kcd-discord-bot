# Kody Discord Gateway Proxy

This Fly app runs one stable external Discord Gateway websocket for Kody. It
receives Discord `MESSAGE_CREATE` gateway dispatches, normalizes them, and calls
Kody's package invocation API so Kody packages can handle replies and traces.

The Fly app name remains `kcd-discord-bot-v2`.

## Runtime environment

Required:

- `DISCORD_BOT_TOKEN`: Discord bot token for the external gateway process.
- `KODY_PACKAGE_INVOCATION_TOKEN`: scoped Kody package invocation bearer token.

Optional:

- `KODY_BASE_URL`: defaults to `https://heykody.dev`.
- `DISCORD_INTENTS`: defaults to `33281`
  (`Guilds,GuildMessages,MessageContent`). This may be a numeric bitfield or a
  comma-separated list of supported intent names.
- `DISCORD_GATEWAY_VERSION`: defaults to `10`.

Set secrets on Fly without printing token values:

```sh
fly secrets set --app kcd-discord-bot-v2 DISCORD_BOT_TOKEN=...
fly secrets set --app kcd-discord-bot-v2 KODY_PACKAGE_INVOCATION_TOKEN=...
```

The proxy uses discord.js to own the normal Discord Gateway lifecycle
(identify, heartbeat, resume, invalid session handling, and Discord-requested
reconnects). It does not use Kody package services and does not run a proactive
reconnect watchdog.

## Development

If you're going to be doing much with the bot, I **strongly advise** you take
just 10 minutes to setup your own test bot and server for local development.

You'll need to create your own discord server for local development and manual
testing (automated testing of Discord bots is extremely difficult and basically
not worth it). You'll also need to create your own bot. It should take ~10
minutes max. Create a
[discord server](https://support.discord.com/hc/en-us/articles/204849977-How-do-I-create-a-server-),
then follow
[the instructions here](https://discordjs.guide/preparations/setting-up-a-bot-application.html)
to create a bot application and
[add it to your server](https://discordjs.guide/preparations/adding-your-bot-to-servers.html).

Once you have that, then copy the `.env.example` to `.env` and set the required
gateway proxy values.

Next run:

```
node ./other/deploy-commands.js
```

That will configure your server to have the slash-commands our bot expects.

Next, run:

```
node ./other/deploy-emoji.js
```

This will update your server with all the emoji reactions the bot has.

Next, run:

```
cp ./app/bot/playground.example.ts ./app/bot/playground.ts
```

That has things setup for you to play around to make the bot do whatever you'd
like. Once you're ready to commit to something then stick it in the appropriate
file in the `./app/bot` directory.

To run the playground file, run:

```
npm run play:bot
```

This will start the playground file in watch mode. Any change you make will
trigger it to be re-run which should make development pretty quick despite no
automated tests.

If you'd like to just run the whole app then run `npm run dev`. Unfortunately I
haven't figured out how to get the bot to restart on changes when doing this
though (yet).
