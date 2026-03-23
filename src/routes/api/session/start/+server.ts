import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getServerDb } from '$lib/server/db';
import { signSessionJwt } from '$lib/server/jwt';
import { getAssignment, setAssignmentStatus } from '$lib/server/assignments';
import { randomUUID } from 'node:crypto';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user || locals.user.role !== 'participant') {
		throw error(403, 'Participants only');
	}

	const body = await request.json().catch(() => null);
	const quiz_id = body?.quiz_id as string | undefined;
	const full_name = (body?.full_name as string | undefined) ?? locals.user.displayName ?? '';

	if (!quiz_id) {
		throw error(400, 'quiz_id required');
	}

	const assignment = getAssignment(locals.user.id, quiz_id);
	if (!assignment) {
		throw error(403, 'Not assigned to this quiz');
	}
	if (assignment.status !== 'scheduled' && assignment.status !== 'in_progress') {
		throw error(403, 'Quiz not available for this account');
	}

	const db = getServerDb();
	const row = db
		.prepare('SELECT duration_minutes FROM quiz_metadata WHERE quiz_id = ? AND status = ?')
		.get(quiz_id, 'active') as { duration_minutes: number } | undefined;

	if (!row) {
		throw error(404, 'Quiz not found');
	}

	const durationMinutes = row.duration_minutes ?? 120;
	const server_now = Date.now();
	const ends_at = server_now + durationMinutes * 60 * 1000;
	const ttlSeconds = durationMinutes * 60 + 300;

	const session_id = randomUUID();

	const token = await signSessionJwt(
		{
			sub: locals.user.id,
			quiz_id,
			session_id,
			full_name,
			server_now,
			ends_at
		},
		ttlSeconds
	);

	db.prepare(
		`INSERT OR REPLACE INTO participant_states (session_id, participant_id, quiz_id, status, current_question_index, answered_count, time_remaining_seconds, jwt_validation_token, full_name)
     VALUES (?, ?, ?, 'waiting', 0, 0, ?, ?, ?)`
	).run(
		session_id,
		locals.user.id,
		quiz_id,
		Math.floor((ends_at - server_now) / 1000),
		token,
		full_name
	);

	if (assignment.status === 'scheduled') {
		setAssignmentStatus(locals.user.id, quiz_id, 'in_progress');
	}

	return json({
		token,
		session_id,
		server_now,
		ends_at,
		duration_minutes: durationMinutes
	});
};
