import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getServerDb } from '$lib/server/db';
import { signSessionJwt } from '$lib/server/jwt';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	const participant_id = body?.participant_id as string | undefined;
	const full_name = body?.full_name as string | undefined;
	const quiz_id = body?.quiz_id as string | undefined;

	if (!participant_id || !quiz_id) {
		throw error(400, 'participant_id and quiz_id required');
	}

	const db = getServerDb();
	const row = db
		.prepare('SELECT duration_minutes FROM quiz_metadata WHERE quiz_id = ?')
		.get(quiz_id) as { duration_minutes: number } | undefined;

	const durationMinutes = row?.duration_minutes ?? 120;
	const server_now = Date.now();
	const ends_at = server_now + durationMinutes * 60 * 1000;

	const ttlSeconds = durationMinutes * 60 + 300;

	const token = await signSessionJwt(
		{
			sub: participant_id,
			quiz_id,
			full_name,
			server_now,
			ends_at
		},
		ttlSeconds
	);

	db.prepare(
		`INSERT OR REPLACE INTO participant_states (participant_id, quiz_id, status, current_question_index, answered_count, time_remaining_seconds, jwt_validation_token, full_name)
     VALUES (?, ?, 'waiting', 0, 0, ?, ?, ?)`
	).run(
		participant_id,
		quiz_id,
		Math.floor((ends_at - server_now) / 1000),
		token,
		full_name ?? ''
	);

	return json({
		token,
		server_now,
		ends_at,
		duration_minutes: durationMinutes
	});
};
