const { http, HttpResponse } = require('msw')
const { setupServer } = require('msw/node')

const server = setupServer(
	http.post('https://api.twitter.com/2/tweets', () => {
		return HttpResponse.json({})
	}),
)

server.listen({ onUnhandledRequest: 'bypass' })
console.info('🔶 Mock server running')

process.once('SIGINT', () => server.close())
process.once('SIGTERM', () => server.close())
