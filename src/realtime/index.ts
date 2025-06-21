import { ClientPlugin, createClient, type NormalizeOAS, type OASClient } from 'fets';
import type openapi from './openapi';

type RealtimeKitOAS = NormalizeOAS<typeof openapi>;

function useAuth(orgId: string, apiKey: string): ClientPlugin {
	const auth = btoa(`${orgId}:${apiKey}`);
	return {
		onRequestInit({ requestInit }) {
			requestInit.headers = {
				...requestInit.headers,
				Authorization: `Basic ${auth}`,
			};
		},
	};
}

export function getRealtimeClient(orgId: string, apiKey: string): OASClient<RealtimeKitOAS> {
	return createClient<NormalizeOAS<typeof openapi>>({
		endpoint: 'https://api.dyte.io/v2',
		fetchFn: self.fetch,
		plugins: [useAuth(orgId, apiKey)],
	});
}
