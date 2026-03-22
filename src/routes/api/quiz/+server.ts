import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import sampleQuiz from '$lib/data/sample-quiz.json';
import { encryptQuizPayload } from '$lib/server/payloadCrypto';
import { getServerDb } from '$lib/server/db';
import type { QuizBundle } from '$lib/types/quiz';

export const GET: RequestHandler = async () => {
	const bundle = sampleQuiz as unknown as QuizBundle;
	const meta = bundle.quiz_metadata;

	const db = getServerDb();
	db.prepare(
		`INSERT OR REPLACE INTO quiz_metadata (quiz_id, title, start_time, duration_minutes, passcode_seed, passcode_interval, operator_started_manually)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
	).run(
		meta.quiz_id,
		meta.title,
		meta.start_time,
		meta.duration_minutes,
		meta.passcode_seed,
		meta.passcode_interval,
		meta.operator_started_manually ? 1 : 0
	);

	const plaintext = JSON.stringify(bundle);
	const encrypted_payload = await encryptQuizPayload(meta.passcode_seed, plaintext);

	return json({
		metadata: {
			quiz_id: meta.quiz_id,
			title: meta.title,
			start_time: meta.start_time,
			duration_minutes: meta.duration_minutes,
			passcode_seed: meta.passcode_seed,
			passcode_interval: meta.passcode_interval,
			operator_started_manually: meta.operator_started_manually ?? false
		},
		encrypted_payload
	});
};
