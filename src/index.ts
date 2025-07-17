import { DurableObject } from 'cloudflare:workers';
import { Browsable, studio } from '@outerbase/browsable-durable-object';
import { RealtimeKitClient } from './realtimekit';
import { Hono } from 'hono';
import { AiConfig, MeetingReadable, RecordingConfigReadable } from './realtimekit/client';

type MeetingData = MeetingReadable & {
	recording_config?: RecordingConfigReadable;
} & {
	ai_config?: AiConfig;
};

type Preset =
	| 'group_call_host'
	| 'group_call_participant'
	| 'livestream_host'
	| 'livestream_viewer'
	| 'webinar_presenter'
	| 'webinar_viewer';

@Browsable()
export class Meeting extends DurableObject<Env> {
	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
	}

	async addParticipant({ id, preset, name }: { id: string; preset: Preset; name: string }): Promise<{ jwt: string }> {
		const client = new RealtimeKitClient(this.env.REALTIMEKIT_ORG_ID, this.env.REALTIMEKIT_API_KEY);

		const meeting = await this.getOrCreateMeeting();

		console.log('Meeting', meeting);

		const addParticipantResponse = await client.addParticipant(meeting.id, {
			preset: preset,
			customId: id,
			name,
		});

		if (!addParticipantResponse.data?.success || addParticipantResponse.data.data === undefined) {
			throw new Error('Error adding participant');
		}

		const participant = addParticipantResponse.data.data;

		console.log('Added Participant', participant);

		return { jwt: participant.token };
	}

	private async getOrCreateMeeting() {
		const existingMeeting = await this.ctx.storage.get<MeetingData>('meeting');
		if (existingMeeting) {
			return existingMeeting;
		}

		const client = new RealtimeKitClient(this.env.REALTIMEKIT_ORG_ID, this.env.REALTIMEKIT_API_KEY);

		const createMeetingResponse = await client.createMeeting({
			region: 'eu-central-1',
			title: 'My Meeting',
		});

		if (!createMeetingResponse.data?.success || createMeetingResponse.data.data === undefined) {
			throw new Error('Error creating meeting');
		}

		const meetingData = createMeetingResponse.data.data;

		console.log('Created Meeting', meetingData);

		await this.ctx.storage.put<MeetingData>('meeting', meetingData);

		return meetingData;
	}
}

const app = new Hono<{ Bindings: Env }>();

app.get('/api/auth-token/:room', async (c) => {
	const room = c.req.param('room');
	const id = c.env.DURABLE_MEETING.idFromName(room);
	const stub = c.env.DURABLE_MEETING.get(id);

	const participant = await stub.addParticipant({
		id: crypto.randomUUID(),
		preset: 'group_call_participant',
		name: "Anonymous",
	});

	return c.text(participant.jwt);
});

if (import.meta.env.DEV) {
	app.all('/studio', (c) => {
		return studio(c.req.raw, c.env.DURABLE_MEETING);
	});
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		return app.fetch(request, env, ctx);
	},
} satisfies ExportedHandler<Env>;
