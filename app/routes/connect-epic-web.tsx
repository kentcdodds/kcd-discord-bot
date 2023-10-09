import { json, type DataFunctionArgs } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'

export async function loader({ request }: DataFunctionArgs) {
	const port = new URL(request.url).searchParams.get('port') ?? '5639'
	const authUrl = new URL('https://discord.com/api/oauth2/authorize')
	authUrl.searchParams.append('client_id', process.env.DISCORD_APP_ID)
	authUrl.searchParams.append(
		'redirect_uri',
		`http://localhost:${port}/discord/callback`,
	)
	authUrl.searchParams.append('response_type', 'code')
	authUrl.searchParams.append('scope', 'identify')
	return json({ authUrl: authUrl.toString() })
}

export default function ConnectEpicWeb() {
	const data = useLoaderData<typeof loader>()

	return (
		<div>
			<Link to={data.authUrl}>Authenticate with Discord and KCD</Link>
		</div>
	)
}
