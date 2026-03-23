import { getServerDb } from './db';
import type { AssignmentStatus } from './db';

export function getAssignment(userId: string, quizId: string) {
	const db = getServerDb();
	return db
		.prepare(`SELECT * FROM quiz_assignments WHERE user_id = ? AND quiz_id = ?`)
		.get(userId, quizId) as
		| {
				id: string;
				user_id: string;
				quiz_id: string;
				status: AssignmentStatus;
				updated_at: number;
		  }
		| undefined;
}

export function setAssignmentStatus(userId: string, quizId: string, status: AssignmentStatus) {
	const db = getServerDb();
	db.prepare(
		`UPDATE quiz_assignments SET status = ?, updated_at = ? WHERE user_id = ? AND quiz_id = ?`
	).run(status, Date.now(), userId, quizId);
}

export function listAssignmentsForUser(userId: string) {
	const db = getServerDb();
	return db
		.prepare(
			`SELECT qa.*, qm.title, qm.start_time, qm.duration_minutes, qm.status as quiz_status
       FROM quiz_assignments qa
       JOIN quiz_metadata qm ON qm.quiz_id = qa.quiz_id
       WHERE qa.user_id = ?
       ORDER BY qm.start_time ASC`
		)
		.all(userId) as {
		id: string;
		user_id: string;
		quiz_id: string;
		status: AssignmentStatus;
		updated_at: number;
		title: string;
		start_time: number;
		duration_minutes: number;
		quiz_status: string;
	}[];
}
