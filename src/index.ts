import { DurableObject } from 'cloudflare:workers';
import { Browsable, studio } from '@outerbase/browsable-durable-object';
import { getRealtimeClient } from './realtime';
import { Hono } from 'hono';

interface MeetingData {
	id: string;
	title: string;
	record_on_start: boolean;
	live_stream_on_start: boolean;
	persist_chat: boolean;
	summarize_on_end: boolean;
	is_large: boolean;
	status: string;
	created_at: string;
	updated_at: string;
	ai_config: {
		conversation: Record<string, unknown>;
		summarization: Record<string, unknown>;
		transcription: Record<string, unknown>;
	};
}

export interface ParticipantData {
	name?: string | null | undefined;
	picture?: string | null | undefined;
	preset_name: string;
	custom_participant_id: string;
	token: string;
	created_at: string;
	updated_at: string;
	id: string;
}

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

	async addParticipant({ id, preset, name }: { id: string; preset: Preset; name: string }): Promise<ParticipantData> {
		const client = getRealtimeClient(this.env.REALTIMEKIT_ORG_ID, this.env.REALTIMEKIT_API_KEY);

		const meeting = await this.getOrCreateMeeting();

		console.log('Meeting', meeting);

		const addParticipantResponse = await client['/meetings/{meeting_id}/participants'].post({
			params: {
				meeting_id: meeting.id,
			},
			json: {
				custom_participant_id: id,
				name: name,
				preset_name: preset,
			},
		});

		if (!addParticipantResponse.ok) {
			throw new Error('Error adding participant');
		}

		const participant = await addParticipantResponse.json();

		if (!participant.success || !participant.data) {
			throw new Error('Error adding participant');
		}

		console.log('Added Participant', participant.data);

		const participantData = participant.data;

		return participantData;
	}

	private async getOrCreateMeeting() {
		const existingMeeting = await this.ctx.storage.get<MeetingData>('meeting');
		if (existingMeeting) {
			return existingMeeting;
		}

		const client = getRealtimeClient(this.env.REALTIMEKIT_ORG_ID, this.env.REALTIMEKIT_API_KEY);

		const createMeetingResponse = await client['/meetings'].post({
			json: {
				preferred_region: 'eu-central-1',
				title: 'My Meeting',
				live_stream_on_start: false,
				persist_chat: false,
				record_on_start: false,
				summarize_on_end: false,
			},
		});

		if (!createMeetingResponse.ok) {
			throw new Error('Error creating meeting');
		}

		const meeting = await createMeetingResponse.json();

		if (!meeting.success || !meeting.data) {
			throw new Error('Error creating meeting');
		}

		const meetingData = meeting.data as unknown as MeetingData;

		console.log('Created Meeting', meetingData);

		await this.ctx.storage.put<MeetingData>('meeting', meetingData);

		return meetingData;
	}
}

const app = new Hono<{ Bindings: Env }>();

app.get('/api/auth-token', async (c) => {
	const id = c.env.DURABLE_MEETING.idFromName('my_meeting');
	const stub = c.env.DURABLE_MEETING.get(id);

	const participant = await stub.addParticipant({
		id: 'tiwi',
		preset: 'group_call_participant',
		name: 'Timo Wilhelm',
	});

	return c.text(participant.token);
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
