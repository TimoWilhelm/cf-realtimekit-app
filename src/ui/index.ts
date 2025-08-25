import RealtimeKitClient from '@cloudflare/realtimekit';
import DyteVideoBackgroundTransformer from '@dytesdk/video-background-transformer';

const init = async () => {
	const room = new URLSearchParams(window.location.search).get('room') || 'default';
	const authTokenUrl = new URL(`/api/auth-token/${room}`, window.location.origin);

	let isHidden = false;

	const query = new URLSearchParams(window.location.search);
	if (query.has('preset')) {
		authTokenUrl.searchParams.set('preset', query.get('preset')!);
		isHidden = query.get('preset') === 'hidden';
	}

	const authToken = await fetch(authTokenUrl).then((response) => response.text());

	const meeting = await RealtimeKitClient.init({
		authToken,
		defaults: {
			audio: !isHidden,
			video: !isHidden,
		},
	});

	await meeting.self.setVideoMiddlewareGlobalConfig({
		disablePerFrameCanvasRendering: true,
	});

	const videoBackgroundTransformer = await DyteVideoBackgroundTransformer.init({
		meeting: meeting,
		segmentationConfig: {
			pipeline: 'webgl2', // 'webgl2' | 'canvas2dCpu'
		},
	});

	const videoMiddleware = await videoBackgroundTransformer.createStaticBackgroundVideoMiddleware(
		`https://assets.dyte.io/backgrounds/bg-dyte-office.jpg`
	);

	meeting.self.addVideoMiddleware(videoMiddleware);

	(document.getElementById('my-meeting') as any)!.meeting = meeting;

	// meeting.ai.on('transcript', (transcriptData) => {
	// 	console.log('Transcript:', transcriptData);
	// });

	const stream = new MediaStream();
	meeting.participants.joined.on('audioUpdate', (participant) => {
		console.log(`A participant with id "${participant.id}" updated their audio track in the meeting`);
		// Use the audio track if it exists
		if (participant.audioEnabled && participant.audioTrack) {
			console.log(participant.audioTrack);
			stream.addTrack(participant.audioTrack);
			recorder.start(5_000);
		} else {
			console.log(`Participant with id "${participant.id}" has no audio track or audio is disabled`);
			recorder.stop();

		}
	});
	const recorder = new MediaRecorder(stream, {
		mimeType: 'audio/webm',
	});
	recorder.ondataavailable = (event) => {
		if (event.data.size > 0) {
			console.log('Audio data available:', event.data);
		}
	};
};

await init();
