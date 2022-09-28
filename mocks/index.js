const { rest } = require('msw')
const { setupServer } = require('msw/node')

const server = setupServer(
	rest.post('https://api.twitter.com/2/tweets', (req, res, ctx) => {
		return res(ctx.json({}))
	}),
)

server.listen({ onUnhandledRequest: 'bypass' })
console.info('🔶 Mock server running')

process.once('SIGINT', () => server.close())
process.once('SIGTERM', () => server.close())
