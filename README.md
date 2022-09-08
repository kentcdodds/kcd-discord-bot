# KCD Discord Bot

This is the KCD Discord Bot. It's hosted on fly. It runs alongside an actual
Remix app (Indie Stack) which we may use to have some kind of UI for controlling
the bot and stuff. Who knows. It was just nice to do this so we'll have a
persistence layer if we decide we need that.

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

Once you have that, then copy the `.env.example` to `.env` and put in values for
everything (you'll need to create channels for several of them).

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
