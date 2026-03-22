import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

let db: Database.Database | null = null;

function getDbPath(): string {
	const dataDir = path.join(process.cwd(), 'data');
	if (!fs.existsSync(dataDir)) {
		fs.mkdirSync(dataDir, { recursive: true });
	}
	return path.join(dataDir, 'cbt-sync.db');
}

export function getServerDb(): Database.Database {
	if (!db) {
		db = new Database(getDbPath());
		db.exec(`
			CREATE TABLE IF NOT EXISTS answer_records (
				id TEXT PRIMARY KEY,
				participant_id TEXT NOT NULL,
				question_id TEXT NOT NULL,
				selected_option_id TEXT,
				is_doubtful INTEGER NOT NULL DEFAULT 0,
				updated_at INTEGER NOT NULL
			);
			CREATE TABLE IF NOT EXISTS participant_states (
				participant_id TEXT PRIMARY KEY,
				quiz_id TEXT NOT NULL,
				status TEXT NOT NULL,
				current_question_index INTEGER NOT NULL DEFAULT 0,
				answered_count INTEGER NOT NULL DEFAULT 0,
				time_remaining_seconds INTEGER NOT NULL DEFAULT 0,
				jwt_validation_token TEXT,
				full_name TEXT
			);
			CREATE TABLE IF NOT EXISTS security_logs (
				log_id TEXT PRIMARY KEY,
				participant_id TEXT NOT NULL,
				quiz_id TEXT NOT NULL,
				event_type TEXT NOT NULL,
				timestamp INTEGER NOT NULL,
				details TEXT
			);
			CREATE TABLE IF NOT EXISTS quiz_metadata (
				quiz_id TEXT PRIMARY KEY,
				title TEXT NOT NULL,
				start_time INTEGER NOT NULL,
				duration_minutes INTEGER NOT NULL,
				passcode_seed TEXT NOT NULL,
				passcode_interval INTEGER NOT NULL,
				operator_started_manually INTEGER NOT NULL DEFAULT 0
			);
		`);
	}
	return db;
}
