import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getServerDb } from '$lib/server/db';

function requireStaff(locals: App.Locals) {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}
	const role = locals.user.role as string;
	if (role !== 'operator' && role !== 'admin') {
		throw error(403, 'Operator or admin only');
	}
}

export const GET: RequestHandler = async ({ params, locals }) => {
	requireStaff(locals);

	const { quizId } = params;
	const db = getServerDb();
	const meta = db.prepare('SELECT * FROM quiz_metadata WHERE quiz_id = ?').get(quizId) as
		| {
				quiz_id: string;
				title: string;
				start_time: number;
				duration_minutes: number;
				passcode_seed: string;
				passcode_interval: number;
				operator_started_manually: number;
		  }
		| undefined;

	if (!meta) {
		throw error(404, 'Quiz not found');
	}

	const participants = db
		.prepare(
			`SELECT participant_id, quiz_id, status, current_question_index, answered_count, time_remaining_seconds, full_name
       FROM participant_states WHERE quiz_id = ?`
		)
		.all(quizId) as {
		participant_id: string;
		quiz_id: string;
		status: string;
		current_question_index: number;
		answered_count: number;
		time_remaining_seconds: number;
		full_name: string;
	}[];

	return json({
		metadata: {
			...meta,
			operator_started_manually: Boolean(meta.operator_started_manually)
		},
		participants
	});
};

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	requireStaff(locals);

	const { quizId } = params;
	const body = await request.json().catch(() => ({}));
	const db = getServerDb();

	const existing = db.prepare('SELECT * FROM quiz_metadata WHERE quiz_id = ?').get(quizId) as Record<
		string,
		unknown
	> | null;
	if (!existing) throw error(404, 'Quiz not found');

	const duration_minutes =
		(body.duration_minutes as number | undefined) ?? (existing.duration_minutes as number);
	const start_time = (body.start_time as number | undefined) ?? (existing.start_time as number);
	const operator_started_manually =
		body.operator_started_manually !== undefined
			? (body.operator_started_manually ? 1 : 0)
			: (existing.operator_started_manually as number);

	db.prepare(
		`UPDATE quiz_metadata SET duration_minutes = ?, start_time = ?, operator_started_manually = ? WHERE quiz_id = ?`
	).run(duration_minutes, start_time, operator_started_manually, quizId);

	const meta = db.prepare('SELECT * FROM quiz_metadata WHERE quiz_id = ?').get(quizId);
	return json({ ok: true, metadata: meta });
};
