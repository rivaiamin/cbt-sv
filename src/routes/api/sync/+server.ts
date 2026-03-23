import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getServerDb } from '$lib/server/db';

type AnswerRec = {
	id: string;
	session_id?: string;
	participant_id: string;
	question_id: string;
	selected_option_id: string;
	is_doubtful: boolean;
	updated_at: number;
};

type PartState = {
	session_id: string;
	participant_id: string;
	quiz_id: string;
	status: string;
	current_question_index: number;
	answered_count: number;
	time_remaining_seconds: number;
	jwt_validation_token: string;
};

type SecLog = {
	log_id: string;
	participant_id: string;
	quiz_id: string;
	event_type: string;
	timestamp: number;
	details: string;
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}
	if (locals.user.role !== 'participant') {
		throw error(403, 'Participants only');
	}

	const uid = locals.user.id;
	const body = await request.json().catch(() => ({}));
	const answer_records = (body.answer_records ?? []) as AnswerRec[];
	const participant_states = (body.participant_states ?? []) as PartState[];
	const security_logs = (body.security_logs ?? []) as SecLog[];

	for (const a of answer_records) {
		if (a.participant_id !== uid) {
			throw error(403, 'Invalid answer payload');
		}
	}
	for (const p of participant_states) {
		if (p.participant_id !== uid) {
			throw error(403, 'Invalid state payload');
		}
	}
	for (const l of security_logs) {
		if (l.participant_id !== uid) {
			throw error(403, 'Invalid log payload');
		}
	}

	const db = getServerDb();

	const upsertAnswer = db.prepare(
		`INSERT OR REPLACE INTO answer_records (id, participant_id, question_id, selected_option_id, is_doubtful, updated_at, exam_session_id)
     VALUES (@id, @participant_id, @question_id, @selected_option_id, @is_doubtful, @updated_at, @exam_session_id)`
	);
	const upsertState = db.prepare(
		`INSERT INTO participant_states (session_id, participant_id, quiz_id, status, current_question_index, answered_count, time_remaining_seconds, jwt_validation_token)
     VALUES (@session_id, @participant_id, @quiz_id, @status, @current_question_index, @answered_count, @time_remaining_seconds, @jwt_validation_token)
     ON CONFLICT(participant_id, quiz_id) DO UPDATE SET
       session_id = excluded.session_id,
       status = excluded.status,
       current_question_index = excluded.current_question_index,
       answered_count = excluded.answered_count,
       time_remaining_seconds = excluded.time_remaining_seconds,
       jwt_validation_token = excluded.jwt_validation_token`
	);
	const insertLog = db.prepare(
		`INSERT OR IGNORE INTO security_logs (log_id, participant_id, quiz_id, event_type, timestamp, details)
     VALUES (@log_id, @participant_id, @quiz_id, @event_type, @timestamp, @details)`
	);

	const tx = db.transaction(() => {
		for (const a of answer_records) {
			upsertAnswer.run({
				...a,
				is_doubtful: a.is_doubtful ? 1 : 0,
				exam_session_id: a.session_id ?? null
			});
		}
		for (const p of participant_states) {
			upsertState.run(p);
		}
		for (const l of security_logs) {
			insertLog.run(l);
		}
	});
	tx();

	return json({ ok: true });
};
