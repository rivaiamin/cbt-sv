import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getServerDb } from '$lib/server/db';

type AnswerRec = {
	id: string;
	participant_id: string;
	question_id: string;
	selected_option_id: string;
	is_doubtful: boolean;
	updated_at: number;
};

type PartState = {
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

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => ({}));
	const answer_records = (body.answer_records ?? []) as AnswerRec[];
	const participant_states = (body.participant_states ?? []) as PartState[];
	const security_logs = (body.security_logs ?? []) as SecLog[];

	const db = getServerDb();

	const upsertAnswer = db.prepare(
		`INSERT OR REPLACE INTO answer_records (id, participant_id, question_id, selected_option_id, is_doubtful, updated_at)
     VALUES (@id, @participant_id, @question_id, @selected_option_id, @is_doubtful, @updated_at)`
	);
	const upsertState = db.prepare(
		`INSERT OR REPLACE INTO participant_states (participant_id, quiz_id, status, current_question_index, answered_count, time_remaining_seconds, jwt_validation_token)
     VALUES (@participant_id, @quiz_id, @status, @current_question_index, @answered_count, @time_remaining_seconds, @jwt_validation_token)`
	);
	const insertLog = db.prepare(
		`INSERT OR IGNORE INTO security_logs (log_id, participant_id, quiz_id, event_type, timestamp, details)
     VALUES (@log_id, @participant_id, @quiz_id, @event_type, @timestamp, @details)`
	);

	const tx = db.transaction(() => {
		for (const a of answer_records) {
			upsertAnswer.run({
				...a,
				is_doubtful: a.is_doubtful ? 1 : 0
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
