import { createClient, type Client } from './client/client';
import { addParticipant, createMeeting, CreateMeetingBody } from './client';

export class RealtimeKitClient {
	#client: Client;

	constructor(orgId: string, apiKey: string) {
		this.#client = createClient({
			baseUrl: 'https://rtk.realtime.cloudflare.com/v2',
			headers: {
				Authorization: `Basic ${btoa(`${orgId}:${apiKey}`)}`,
			},
		});

		this.#client.interceptors.response.use(async (response) => {
			if (!response.ok) {
				console.log(`request to ${response.url} failed`, response.status, await response.text());
			}
			return response;
		});
	}

	public async addParticipant(meetingId: string, participant: { customId: string; name: string; preset: string }) {
		return await addParticipant({
			client: this.#client,
			path: {
				meeting_id: meetingId,
			},
			body: {
				preset_name: participant.preset,
				custom_participant_id: participant.customId,
				name: participant.name,
			},
		});
	}

	public async createMeeting(meeting: { region: CreateMeetingBody['preferred_region']; title: string, }) {
		return await createMeeting({
			client: this.#client,
			body: {
				preferred_region: meeting.region,
				title: meeting.title,
				summarize_on_end: true,
				record_on_start: false,
				ai_config: {
					summarization: {
						summary_type: "general",
						text_format: "markdown",
					},
					transcription: {
						keywords: ['RealtimeKit'],
						language: 'en-US',
						profanity_filter: false,
					},
				},
			},
		});
	}
}
