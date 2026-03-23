import type { RxJsonSchema } from 'rxdb';

export const quizMetadataSchema: RxJsonSchema<{
	quiz_id: string;
	title: string;
	start_time: number;
	duration_minutes: number;
	passcode_seed: string;
	passcode_interval: number;
	operator_started_manually: boolean;
}> = {
	version: 0,
	primaryKey: 'quiz_id',
	type: 'object',
	properties: {
		quiz_id: { type: 'string', maxLength: 200 },
		title: { type: 'string' },
		start_time: { type: 'number' },
		duration_minutes: { type: 'number' },
		passcode_seed: { type: 'string' },
		passcode_interval: { type: 'number' },
		operator_started_manually: { type: 'boolean' }
	},
	required: ['quiz_id', 'start_time', 'duration_minutes'],
	indexes: []
};

export const questionBlockSchema: RxJsonSchema<{
	block_id: string;
	quiz_id: string;
	shared_content: string;
	questions_json: string;
	randomize_inner_questions: boolean;
}> = {
	version: 0,
	primaryKey: 'block_id',
	type: 'object',
	properties: {
		block_id: { type: 'string', maxLength: 200 },
		quiz_id: { type: 'string', maxLength: 200 },
		shared_content: { type: 'string' },
		questions_json: { type: 'string' },
		randomize_inner_questions: { type: 'boolean' }
	},
	required: ['block_id', 'quiz_id', 'questions_json'],
	indexes: ['quiz_id']
};

export const answerRecordSchema: RxJsonSchema<{
	id: string;
	session_id: string;
	participant_id: string;
	question_id: string;
	selected_option_id: string;
	is_doubtful: boolean;
	updated_at: number;
}> = {
	version: 0,
	primaryKey: 'id',
	type: 'object',
	properties: {
		id: { type: 'string', maxLength: 400 },
		session_id: { type: 'string', maxLength: 200 },
		participant_id: { type: 'string', maxLength: 200 },
		question_id: { type: 'string', maxLength: 200 },
		selected_option_id: { type: 'string', maxLength: 200 },
		is_doubtful: { type: 'boolean' },
		updated_at: { type: 'number' }
	},
	required: ['id', 'session_id', 'participant_id', 'question_id', 'updated_at'],
	indexes: ['participant_id', 'question_id', 'session_id']
};

export const participantStateSchema: RxJsonSchema<{
	id: string;
	session_id: string;
	participant_id: string;
	quiz_id: string;
	status: string;
	current_question_index: number;
	answered_count: number;
	time_remaining_seconds: number;
	jwt_validation_token: string;
}> = {
	version: 0,
	primaryKey: 'id',
	type: 'object',
	properties: {
		id: { type: 'string', maxLength: 400 },
		session_id: { type: 'string', maxLength: 200 },
		participant_id: { type: 'string', maxLength: 200 },
		quiz_id: { type: 'string', maxLength: 200 },
		status: { type: 'string', maxLength: 40 },
		current_question_index: { type: 'number' },
		answered_count: { type: 'number' },
		time_remaining_seconds: { type: 'number' },
		jwt_validation_token: { type: 'string', maxLength: 8000 }
	},
	required: ['id', 'session_id', 'participant_id', 'quiz_id', 'status'],
	indexes: ['quiz_id', 'participant_id']
};

export const securityLogSchema: RxJsonSchema<{
	log_id: string;
	participant_id: string;
	quiz_id: string;
	event_type: string;
	timestamp: number;
	details: string;
}> = {
	version: 0,
	primaryKey: 'log_id',
	type: 'object',
	properties: {
		log_id: { type: 'string', maxLength: 200 },
		participant_id: { type: 'string', maxLength: 200 },
		quiz_id: { type: 'string', maxLength: 200 },
		event_type: { type: 'string', maxLength: 80 },
		timestamp: { type: 'number' },
		details: { type: 'string' }
	},
	required: ['log_id', 'participant_id', 'quiz_id', 'event_type', 'timestamp'],
	indexes: ['participant_id', 'quiz_id']
};

export const sessionLayoutSchema: RxJsonSchema<{
	id: string;
	participant_id: string;
	quiz_id: string;
	block_order_json: string;
	question_orders_json: string;
}> = {
	version: 0,
	primaryKey: 'id',
	type: 'object',
	properties: {
		id: { type: 'string', maxLength: 200 },
		participant_id: { type: 'string', maxLength: 200 },
		quiz_id: { type: 'string', maxLength: 200 },
		block_order_json: { type: 'string' },
		question_orders_json: { type: 'string' }
	},
	required: ['id', 'participant_id', 'quiz_id', 'block_order_json', 'question_orders_json'],
	indexes: ['quiz_id']
};

export const uiSettingsSchema: RxJsonSchema<{
	id: string;
	duration_minutes: number;
	max_questions: number;
	proctoring_json: string;
}> = {
	version: 0,
	primaryKey: 'id',
	type: 'object',
	properties: {
		id: { type: 'string', maxLength: 40 },
		duration_minutes: { type: 'number' },
		max_questions: { type: 'number' },
		proctoring_json: { type: 'string' }
	},
	required: ['id', 'duration_minutes', 'max_questions', 'proctoring_json'],
	indexes: []
};
