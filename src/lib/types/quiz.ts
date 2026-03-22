/** Wire format for import / API (aligned with PRD QuestionBlock) */
export interface QuizOption {
	option_id: string;
	text: string;
}

export interface QuizQuestion {
	question_id: string;
	question_text: string;
	options: QuizOption[];
}

export interface QuizBlockImport {
	block_id: string;
	shared_content: string;
	questions: QuizQuestion[];
	randomize_inner_questions: boolean;
}

export interface QuizBundle {
	quiz_metadata: {
		quiz_id: string;
		title: string;
		start_time: number;
		duration_minutes: number;
		passcode_seed: string;
		passcode_interval: number;
		operator_started_manually?: boolean;
	};
	blocks: QuizBlockImport[];
}

/** UI-facing block (matches former ExamBlock) */
export interface Question {
	id: string;
	text: string;
	options: { id: string; text: string }[];
}

export interface ExamBlock {
	id: string;
	title: string;
	passage: string;
	questions: Question[];
}
