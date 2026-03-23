import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
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
		quiz_metadata: { schema: quizMetadataSchema },
		question_block: { schema: questionBlockSchema },
		answer_record: { schema: answerRecordSchema },
		participant_state: { schema: participantStateSchema },
		security_log: { schema: securityLogSchema },
		session_layout: { schema: sessionLayoutSchema },
		ui_settings: { schema: uiSettingsSchema }
	});

	return db as unknown as ExamDatabase;
}
