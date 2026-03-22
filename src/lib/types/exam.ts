import type { ExamBlock } from './quiz';

export interface ProctoringRules {
	tabSwitchDetection: boolean;
	rightClickDisabled: boolean;
	fullscreenRequired: boolean;
}

export interface ExamState {
	studentId: string;
	fullName: string;
	quizId: string;
	sessionId: string;
	orderedBlocks: ExamBlock[];
	currentGlobalIndex: number;
	answers: Record<string, string>;
	flagged: Set<string>;
	startTime: number | null;
	durationMinutes: number;
	maxQuestions: number;
	proctoringRules: ProctoringRules;
	isStarted: boolean;
	isSubmitted: boolean;
	/** JWT for server time / heartbeat */
	jwtToken: string;
	endsAtMs: number;
	serverSkewMs: number;
	securityEventCount: number;
}
