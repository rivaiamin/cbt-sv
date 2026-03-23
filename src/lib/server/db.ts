import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';
import sampleQuiz from '$lib/data/sample-quiz.json';
import { encryptQuizPayload } from '$lib/server/payloadCrypto';
import type { QuizBundle } from '$lib/types/quiz';

let db: Database.Database | null = null;

export type UserRole = 'participant' | 'operator' | 'admin';

export type AssignmentStatus = 'scheduled' | 'in_progress' | 'submitted' | 'expired';

function getDbPath(): string {
	const dataDir = path.join(process.cwd(), 'data');
	if (!fs.existsSync(dataDir)) {
		fs.mkdirSync(dataDir, { recursive: true });
	}
	return path.join(dataDir, 'cbt-sync.db');
}

function migrateParticipantStates(db: Database.Database) {
	const cols = db.prepare(`PRAGMA table_info(participant_states)`).all() as { name: string; pk: number }[];
	if (cols.length === 0) return;

	// Legacy migration: ensure session_id column exists.
	const hasSessionId = cols.some((c) => c.name === 'session_id');
	if (!hasSessionId) {
		db.exec(`
			CREATE TABLE participant_states_new (
				session_id TEXT PRIMARY KEY,
				participant_id TEXT NOT NULL,
				quiz_id TEXT NOT NULL,
				status TEXT NOT NULL,
				current_question_index INTEGER NOT NULL DEFAULT 0,
				answered_count INTEGER NOT NULL DEFAULT 0,
				time_remaining_seconds INTEGER NOT NULL DEFAULT 0,
				jwt_validation_token TEXT,
				full_name TEXT
			);
		`);

		const rows = db.prepare(`SELECT * FROM participant_states`).all() as Record<string, unknown>[];
		for (const r of rows) {
			const sid = randomUUID();
			db.prepare(
				`INSERT INTO participant_states_new (session_id, participant_id, quiz_id, status, current_question_index, answered_count, time_remaining_seconds, jwt_validation_token, full_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
			).run(
				sid,
				r.participant_id,
				r.quiz_id,
				r.status,
				r.current_question_index ?? 0,
				r.answered_count ?? 0,
				r.time_remaining_seconds ?? 0,
				r.jwt_validation_token ?? '',
				r.full_name ?? ''
			);
		}

		db.exec(`DROP TABLE participant_states; ALTER TABLE participant_states_new RENAME TO participant_states;`);
	}

	// Enforce uniqueness per (participant_id, quiz_id).
	const cols2 = db.prepare(`PRAGMA table_info(participant_states)`).all() as { name: string; pk: number }[];
	const pkCols = cols2.filter((c) => c.pk > 0).map((c) => c.name);
	const hasCompositePk = pkCols.includes('participant_id') && pkCols.includes('quiz_id');
	if (hasCompositePk) return;

	db.exec(`
		CREATE TABLE participant_states_new (
			participant_id TEXT NOT NULL,
			quiz_id TEXT NOT NULL,
			session_id TEXT NOT NULL,
			status TEXT NOT NULL,
			current_question_index INTEGER NOT NULL DEFAULT 0,
			answered_count INTEGER NOT NULL DEFAULT 0,
			time_remaining_seconds INTEGER NOT NULL DEFAULT 0,
			jwt_validation_token TEXT,
			full_name TEXT,
			PRIMARY KEY (participant_id, quiz_id)
		);
	`);

	// Pick the most advanced row per participant+quiz (best-effort heuristic).
	db.exec(`
		INSERT INTO participant_states_new (
			participant_id, quiz_id, session_id, status, current_question_index, answered_count, time_remaining_seconds, jwt_validation_token, full_name
		)
		SELECT
			participant_id,
			quiz_id,
			session_id,
			status,
			COALESCE(current_question_index, 0),
			COALESCE(answered_count, 0),
			COALESCE(time_remaining_seconds, 0),
			jwt_validation_token,
			full_name
		FROM (
			SELECT
				*,
				ROW_NUMBER() OVER (
					PARTITION BY participant_id, quiz_id
					ORDER BY answered_count DESC, current_question_index DESC
				) AS rn
			FROM participant_states
		) t
		WHERE rn = 1;
	`);

	db.exec(`DROP TABLE participant_states; ALTER TABLE participant_states_new RENAME TO participant_states;`);

	db.exec(`
		CREATE INDEX IF NOT EXISTS idx_participant_states_participant ON participant_states(participant_id);
		CREATE INDEX IF NOT EXISTS idx_participant_states_quiz ON participant_states(quiz_id);
	`);
}

function runMigrations(database: Database.Database) {
	database.exec(`
		CREATE TABLE IF NOT EXISTS auth_user (
			id TEXT NOT NULL PRIMARY KEY,
			username TEXT NOT NULL UNIQUE,
			password_hash TEXT NOT NULL,
			role TEXT NOT NULL CHECK (role IN ('participant', 'operator', 'admin')),
			display_name TEXT NOT NULL DEFAULT ''
		);

		CREATE TABLE IF NOT EXISTS auth_session (
			id TEXT NOT NULL PRIMARY KEY,
			user_id TEXT NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
			expires_at INTEGER NOT NULL
		);

		CREATE TABLE IF NOT EXISTS quiz_assignments (
			id TEXT NOT NULL PRIMARY KEY,
			user_id TEXT NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
			quiz_id TEXT NOT NULL,
			status TEXT NOT NULL CHECK (status IN ('scheduled', 'in_progress', 'submitted', 'expired')),
			updated_at INTEGER NOT NULL,
			UNIQUE (user_id, quiz_id)
		);

		CREATE INDEX IF NOT EXISTS idx_quiz_assignments_user ON quiz_assignments(user_id);
		CREATE INDEX IF NOT EXISTS idx_quiz_assignments_quiz ON quiz_assignments(quiz_id);
	`);

	const qmCols = database.prepare(`PRAGMA table_info(quiz_metadata)`).all() as { name: string }[];
	if (qmCols.length && !qmCols.some((c) => c.name === 'encrypted_payload')) {
		database.exec(`ALTER TABLE quiz_metadata ADD COLUMN encrypted_payload TEXT`);
	}
	if (qmCols.length && !qmCols.some((c) => c.name === 'status')) {
		database.exec(`ALTER TABLE quiz_metadata ADD COLUMN status TEXT NOT NULL DEFAULT 'active'`);
	}
	if (qmCols.length && !qmCols.some((c) => c.name === 'source')) {
		database.exec(`ALTER TABLE quiz_metadata ADD COLUMN source TEXT`);
	}
	if (qmCols.length && !qmCols.some((c) => c.name === 'external_ref')) {
		database.exec(`ALTER TABLE quiz_metadata ADD COLUMN external_ref TEXT`);
	}

	const arCols = database.prepare(`PRAGMA table_info(answer_records)`).all() as { name: string }[];
	if (arCols.length && !arCols.some((c) => c.name === 'exam_session_id')) {
		database.exec(`ALTER TABLE answer_records ADD COLUMN exam_session_id TEXT`);
	}

	migrateParticipantStates(database);
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
				updated_at INTEGER NOT NULL,
				exam_session_id TEXT
			);
			CREATE TABLE IF NOT EXISTS participant_states (
				participant_id TEXT NOT NULL,
				quiz_id TEXT NOT NULL,
				session_id TEXT NOT NULL,
				status TEXT NOT NULL,
				current_question_index INTEGER NOT NULL DEFAULT 0,
				answered_count INTEGER NOT NULL DEFAULT 0,
				time_remaining_seconds INTEGER NOT NULL DEFAULT 0,
				jwt_validation_token TEXT,
				full_name TEXT,
				PRIMARY KEY (participant_id, quiz_id)
			);
			CREATE INDEX IF NOT EXISTS idx_participant_states_participant ON participant_states(participant_id);
			CREATE INDEX IF NOT EXISTS idx_participant_states_quiz ON participant_states(quiz_id);
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
				operator_started_manually INTEGER NOT NULL DEFAULT 0,
				encrypted_payload TEXT,
				status TEXT NOT NULL DEFAULT 'active',
				source TEXT,
				external_ref TEXT
			);
		`);
		runMigrations(db);
	}
	return db;
}

export async function seedDevUsersIfEmpty(): Promise<void> {
	const database = getServerDb();
	const n = database.prepare(`SELECT COUNT(*) as c FROM auth_user`).get() as { c: number };
	if (n.c > 0) return;

	const password = process.env.SEED_PASSWORD ?? 'changeme123';
	const h = await hash(password);

	const insert = database.prepare(
		`INSERT INTO auth_user (id, username, password_hash, role, display_name) VALUES (?, ?, ?, ?, ?)`
	);
	insert.run(randomUUID(), 'student', h, 'participant', 'Demo Student');
	insert.run(randomUUID(), 'operator', h, 'operator', 'Demo Operator');
	insert.run(randomUUID(), 'admin', h, 'admin', 'Demo Admin');

	const bundle = sampleQuiz as unknown as QuizBundle;
	const meta = bundle.quiz_metadata;
	const existingQuiz = database.prepare(`SELECT quiz_id FROM quiz_metadata WHERE quiz_id = ?`).get(meta.quiz_id);
	if (!existingQuiz) {
		const plaintext = JSON.stringify(bundle);
		const encrypted_payload = await encryptQuizPayload(meta.passcode_seed, plaintext);
		database
			.prepare(
				`INSERT INTO quiz_metadata (quiz_id, title, start_time, duration_minutes, passcode_seed, passcode_interval, operator_started_manually, encrypted_payload, status, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', 'seed')`
			)
			.run(
				meta.quiz_id,
				meta.title,
				meta.start_time,
				meta.duration_minutes,
				meta.passcode_seed,
				meta.passcode_interval,
				meta.operator_started_manually ? 1 : 0,
				encrypted_payload
			);
	}

	const student = database.prepare(`SELECT id FROM auth_user WHERE username = ?`).get('student') as {
		id: string;
	};
	const assign = database.prepare(
		`INSERT OR IGNORE INTO quiz_assignments (id, user_id, quiz_id, status, updated_at) VALUES (?, ?, ?, ?, ?)`
	);
	assign.run(randomUUID(), student.id, 'demo-quiz-001', 'scheduled', Date.now());
}

export async function verifyUserPassword(passwordHash: string, plain: string): Promise<boolean> {
	try {
		return await verify(passwordHash, plain);
	} catch {
		return false;
	}
}
