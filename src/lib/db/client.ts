import { createRxDatabase, addRxPlugin } from 'rxdb/plugins/core';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { RxDBMigrationSchemaPlugin } from 'rxdb/plugins/migration-schema';
import type { MigrationStrategy } from 'rxdb';
import type { RxDatabase, RxCollection } from 'rxdb';
import {
	quizMetadataSchema,
	questionBlockSchema,
	answerRecordSchema,
	participantStateSchema,
	securityLogSchema,
	sessionLayoutSchema,
	uiSettingsSchema
} from './schemas';

addRxPlugin(RxDBMigrationSchemaPlugin);

export type QuizMetadataDoc = {
	quiz_id: string;
	title: string;
	start_time: number;
	duration_minutes: number;
	passcode_seed: string;
	passcode_interval: number;
	operator_started_manually: boolean;
};

export type QuestionBlockDoc = {
	block_id: string;
	quiz_id: string;
	shared_content: string;
	questions_json: string;
	randomize_inner_questions: boolean;
};

export type ExamCollections = {
	quiz_metadata: RxCollection<QuizMetadataDoc>;
	question_block: RxCollection<QuestionBlockDoc>;
	answer_record: RxCollection<{
		id: string;
		session_id: string;
		participant_id: string;
		question_id: string;
		selected_option_id: string;
		is_doubtful: boolean;
		updated_at: number;
	}>;
	participant_state: RxCollection<{
		id: string;
		session_id: string;
		participant_id: string;
		quiz_id: string;
		status: string;
		current_question_index: number;
		answered_count: number;
		time_remaining_seconds: number;
		jwt_validation_token: string;
	}>;
	security_log: RxCollection<{
		log_id: string;
		participant_id: string;
		quiz_id: string;
		event_type: string;
		timestamp: number;
		details: string;
	}>;
	session_layout: RxCollection<{
		id: string;
		participant_id: string;
		quiz_id: string;
		block_order_json: string;
		question_orders_json: string;
	}>;
	ui_settings: RxCollection<{
		id: string;
		duration_minutes: number;
		max_questions: number;
		proctoring_json: string;
	}>;
};

export type ExamDatabase = RxDatabase<ExamCollections>;

let dbPromise: Promise<ExamDatabase> | null = null;

/** RxDB DB6: bump schema version when hashes change; identity keeps existing docs valid. */
const toV1: MigrationStrategy<unknown> = (oldDoc) => oldDoc;

/**
 * Running v0→v1 migrations in parallel (default autoMigrate) races on Dexie and can close storages
 * mid-migration (DM4 / "RxStorageInstanceDexie is closed"). Disable auto-migrate and await each
 * migration in order after all collections exist.
 */
const migrationOpts = { migrationStrategies: { 1: toV1 }, autoMigrate: false as const };

const COLLECTIONS_IN_MIGRATION_ORDER = [
	'quiz_metadata',
	'question_block',
	'answer_record',
	'participant_state',
	'security_log',
	'session_layout',
	'ui_settings'
] as const;

/** migration-schema plugin adds this; types don't include it on RxCollection. */
type MigratableCollection = RxCollection & {
	migratePromise: (batchSize?: number) => Promise<unknown>;
};

export function getExamDatabase(): Promise<ExamDatabase> {
	if (!dbPromise) {
		dbPromise = createExamDatabase();
	}
	return dbPromise;
}

async function createExamDatabase(): Promise<ExamDatabase> {
	const db = await createRxDatabase({
		name: 'cbt_exam_v2',
		storage: getRxStorageDexie(),
		ignoreDuplicate: true
	});

	await db.addCollections({
		quiz_metadata: { schema: quizMetadataSchema, ...migrationOpts },
		question_block: { schema: questionBlockSchema, ...migrationOpts },
		answer_record: { schema: answerRecordSchema, ...migrationOpts },
		participant_state: { schema: participantStateSchema, ...migrationOpts },
		security_log: { schema: securityLogSchema, ...migrationOpts },
		session_layout: { schema: sessionLayoutSchema, ...migrationOpts },
		ui_settings: { schema: uiSettingsSchema, ...migrationOpts }
	});

	for (const name of COLLECTIONS_IN_MIGRATION_ORDER) {
		await (db.collections[name] as MigratableCollection).migratePromise();
	}

	return db as unknown as ExamDatabase;
}
