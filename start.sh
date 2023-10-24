#!/bin/sh

set -ex
# node ./scripts/deploy-commands.js
# node ./scripts/deploy-emoji.js
node ./scripts/setup-swap.js
npm run start
