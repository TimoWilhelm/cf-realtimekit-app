import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
	input: 'https://docs.realtime.cloudflare.com/api/v2.yaml',
	output: 'src/realtimekit/client',
	plugins: ['@hey-api/client-fetch'],
});
