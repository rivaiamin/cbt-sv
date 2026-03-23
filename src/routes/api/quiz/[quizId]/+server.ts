import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getServerDb } from '$lib/server/db';
import { encryptQuizPayload } from '$lib/server/payloadCrypto';
import sampleQuiz from '$lib/data/sample-quiz.json';
import { getAssignment } from '$lib/server/assignments';
import type { QuizBundle } from '$lib/types/quiz';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const { quizId } = params;
	const db = getServerDb();
	const row = db
		.prepare(
			`SELECT quiz_id, title, start_time, duration_minutes, passcode_seed, passcode_interval, operator_started_manually, encrypted_payload
       FROM quiz_metadata WHERE quiz_id = ? AND status = 'active'`
		)
		.get(quizId) as
		| {
				quiz_id: string;
				title: string;
				start_time: number;
				duration_minutes: number;
				passcode_seed: string;
				passcode_interval: number;
				operator_started_manually: number;
				encrypted_payload: string | null;
		  }
		| undefined;

	if (!row) {
		throw error(404, 'Quiz not found');
	}

	if (locals.user.role === 'participant') {
		const a = getAssignment(locals.user.id, quizId);
		if (!a || (a.status !== 'scheduled' && a.status !== 'in_progress')) {
			throw error(403, 'Not assigned to this quiz');
		}
	} else if (locals.user.role !== 'operator' && locals.user.role !== 'admin') {
		throw error(403, 'Forbidden');
	}

	let encrypted_payload = row.encrypted_payload;
	if (!encrypted_payload) {
		const bundle = sampleQuiz as unknown as QuizBundle;
		if (bundle.quiz_metadata.quiz_id !== quizId) {
			throw error(404, 'Quiz payload not available');
		}
		const plaintext = JSON.stringify(bundle);
		encrypted_payload = await encryptQuizPayload(row.passcode_seed, plaintext);
	}

	return json({
		metadata: {
			quiz_id: row.quiz_id,
			title: row.title,
			start_time: row.start_time,
			duration_minutes: row.duration_minutes,
			passcode_seed: row.passcode_seed,
			passcode_interval: row.passcode_interval,
			operator_started_manually: Boolean(row.operator_started_manually)
		},
		encrypted_payload
	});
};
