# Cloudflare RealtimeKit Example

This repository is a sample app for creating and joining meetings using [Cloudflare RealtimeKit](https://realtime.cloudflare.com/).

It uses Cloudflare Workers and Durable Objects to store meeting information host an API and serve the frontend to join calls.

## Setup

Create a `.dev.vars` file with the following content:

```
REALTIMEKIT_ORG_ID=<Your_Organization_ID>
REALTIMEKIT_API_KEY=<Your_API_Key>

```

You can find the Organization ID and API Key in the [RealtimeKit Dashboard](https://dash.realtime.cloudflare.com/)
