import { createClient, type NormalizeOAS } from 'fets';
import type openapi from './openapi';

export const getRealtimeClient = (orgId: string, apiKey: string) => {
	const auth = btoa(`${orgId}:${apiKey}`);

	return createClient<NormalizeOAS<typeof openapi>>({
		endpoint: 'https://api.dyte.io/v2',
		fetchFn: self.fetch,
		globalParams: {
			headers: {
				Authorization: `Basic ${auth}`,
			},
		},
	});
};
