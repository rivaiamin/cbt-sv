import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import { getExamDatabase } from '$lib/db/client';
import {
	importQuizBundleIntoRxDB,
	persistSessionLayout,
	computeShuffledLayout,
	type SessionLayoutResult
} from '$lib/db/quizOps';
import { rebuildOrderedBlocksFromLayout, loadAnswersForSession } from '$lib/db/sessionRestore';
import { loadUiSettings, saveUiSettings } from '$lib/db/uiSettings';
import type { QuizBundle } from '$lib/types/quiz';
import type { ExamState, ProctoringRules } from '$lib/types/exam';
import { triggerSync } from '$lib/sync/backgroundSync';

export type { ProctoringRules } from '$lib/types/exam';
export type { Question, ExamBlock } from '$lib/types/quiz';

const SESSION_KEY = 'cbt_session_meta';

function participantStateId(participantId: string, quizId: string): string {
	return `${participantId}__${quizId}`;
}

function sessionMeta(): { sessionId: string; quizId: string; participantId: string } | null {
	if (!browser) return null;
	const raw = sessionStorage.getItem(SESSION_KEY);
	if (!raw) return null;
	try {
		return JSON.parse(raw) as { sessionId: string; quizId: string; participantId: string };
	} catch {
		return null;
	}
}

function setSessionMeta(meta: { sessionId: string; quizId: string; participantId: string } | null) {
	if (!browser) return;
	if (meta) sessionStorage.setItem(SESSION_KEY, JSON.stringify(meta));
	else sessionStorage.removeItem(SESSION_KEY);
}

const initialState: ExamState = {
	studentId: '',
	fullName: '',
	quizId: '',
	sessionId: '',
	orderedBlocks: [],
	currentGlobalIndex: 0,
	answers: {},
	flagged: new Set(),
	startTime: null,
	durationMinutes: 120,
	maxQuestions: 50,
	proctoringRules: {
		tabSwitchDetection: true,
		rightClickDisabled: true,
		fullscreenRequired: false
	},
	isStarted: false,
	isSubmitted: false,
	jwtToken: '',
	endsAtMs: 0,
	serverSkewMs: 0,
	securityEventCount: 0
};

function flattenIndices(orderedBlocks: ExamState['orderedBlocks']) {
	const out: { blockIdx: number; qIdx: number; questionId: string }[] = [];
	for (let bi = 0; bi < orderedBlocks.length; bi++) {
		for (let qi = 0; qi < orderedBlocks[bi].questions.length; qi++) {
			out.push({
				blockIdx: bi,
				qIdx: qi,
				questionId: orderedBlocks[bi].questions[qi].id
			});
		}
	}
	return out;
}

async function upsertAnswerRecord(
	sessionId: string,
	participantId: string,
	questionId: string,
	partial: { selected_option_id?: string; is_doubtful?: boolean }
) {
	const db = await getExamDatabase();
	const id = `${sessionId}_${questionId}`;
	const existing = await db.answer_record.findOne(id).exec();
	const prev = existing ? existing.toMutableJSON() : null;
	const updated_at = Date.now();
	const base = {
		id,
		session_id: sessionId,
		participant_id: participantId,
		question_id: questionId,
		selected_option_id: partial.selected_option_id ?? prev?.selected_option_id ?? '',
		is_doubtful: partial.is_doubtful ?? prev?.is_doubtful ?? false,
		updated_at
	};
	await db.answer_record.upsert(base);
}

async function upsertParticipantState(
	sessionId: string,
	participantId: string,
	quizId: string,
	partial: Partial<{
		status: string;
		current_question_index: number;
		answered_count: number;
		time_remaining_seconds: number;
		jwt_validation_token: string;
	}>
) {
	const db = await getExamDatabase();
	const id = participantStateId(participantId, quizId);
	const existing = await db.participant_state.findOne(id).exec();
	const prev = existing ? existing.toMutableJSON() : null;
	const row = {
		id,
		session_id: sessionId,
		participant_id: participantId,
		quiz_id: quizId,
		status: partial.status ?? prev?.status ?? 'active',
		current_question_index: partial.current_question_index ?? prev?.current_question_index ?? 0,
		answered_count: partial.answered_count ?? prev?.answered_count ?? 0,
		time_remaining_seconds:
			partial.time_remaining_seconds ?? prev?.time_remaining_seconds ?? 0,
		jwt_validation_token: partial.jwt_validation_token ?? prev?.jwt_validation_token ?? ''
	};
	await db.participant_state.upsert(row);
}

const createExamStore = () => {
	const { subscribe, set, update } = writable<ExamState>(initialState);

	const syncNav = async (globalIndex: number) => {
		const s = get({ subscribe });
		if (!s.studentId || !s.quizId || !s.sessionId) return;
		await upsertParticipantState(s.sessionId, s.studentId, s.quizId, {
			current_question_index: globalIndex,
			answered_count: Object.keys(s.answers).length
		});
		void triggerSync();
	};

	const store = {
		subscribe,
		/** Call once in browser (e.g. layout) to hydrate UI settings from RxDB */
		async initClientDb(): Promise<void> {
			if (!browser) return;
			const ui = await loadUiSettings();
			update((s) => ({
				...s,
				durationMinutes: ui.durationMinutes,
				maxQuestions: ui.maxQuestions,
				proctoringRules: ui.proctoringRules
			}));
		},
		async tryRestoreSession(
			expectedQuizId?: string,
			participantIdOverride?: string,
			fullNameOverride?: string
		): Promise<boolean> {
			if (!browser) return false;
			const meta = sessionMeta();

			// If sessionStorage metadata is missing, we fall back to the unique
			// participant_state document in local RxDB (keyed by participant+quiz).
			const participantId = participantIdOverride ?? meta?.participantId;
			const quizId = expectedQuizId ?? meta?.quizId;
			if (!quizId) return false;

			// Ensure sessionStorage matches quizId if it exists.
			if (expectedQuizId && meta?.quizId && meta.quizId !== expectedQuizId) {
				setSessionMeta(null);
			}

			const db = await getExamDatabase();
			let state: {
				session_id: string;
				current_question_index: number;
				time_remaining_seconds: number;
				jwt_validation_token: string;
			} | null = null;

			if (participantId) {
				const existingState = await db.participant_state
					.findOne(participantStateId(participantId, quizId))
					.exec();
				state = existingState ? existingState.toMutableJSON() : null;
			}

			// Prefer sessionStorage sessionId; otherwise use participant_state.session_id.
			const sessionId = meta?.sessionId ?? state?.session_id;
			const resolvedParticipantId = meta?.participantId ?? (participantId ?? null);
			if (!sessionId || !resolvedParticipantId) return false;

			const blocks = await rebuildOrderedBlocksFromLayout(quizId, sessionId);
			if (!blocks?.length) return false;

			const { answers, flagged } = await loadAnswersForSession(sessionId);
			const ui = await loadUiSettings();

			const endsAtMs = Date.now() + Math.max(0, state?.time_remaining_seconds ?? 0) * 1000;

			update((s) => ({
				...s,
				studentId: resolvedParticipantId,
				fullName: fullNameOverride ?? s.fullName,
				quizId,
				sessionId,
				orderedBlocks: blocks,
				currentGlobalIndex: state?.current_question_index ?? 0,
				answers,
				flagged,
				durationMinutes: ui.durationMinutes,
				maxQuestions: ui.maxQuestions,
				proctoringRules: ui.proctoringRules,
				isStarted: true,
				isSubmitted: false,
				jwtToken: state?.jwt_validation_token ?? '',
				endsAtMs,
				serverSkewMs: 0,
				startTime: Date.now()
			}));

			// Rehydrate sessionStorage for the rest of this tab.
			setSessionMeta({
				sessionId,
				quizId,
				participantId: resolvedParticipantId
			});

			return true;
		},
		async unlockAndStartSession(opts: {
			studentId: string;
			fullName: string;
			bundle: QuizBundle;
			/** Server-issued exam attempt id */
			sessionId: string;
			jwtToken: string;
			endsAtMs: number;
			serverNowMs: number;
		}): Promise<void> {
			const { studentId, fullName, bundle, sessionId, jwtToken, endsAtMs, serverNowMs } = opts;
			await importQuizBundleIntoRxDB(bundle);
			const layout: SessionLayoutResult = computeShuffledLayout(bundle, sessionId);
			await persistSessionLayout(studentId, bundle.quiz_metadata.quiz_id, layout);

			const skew = serverNowMs - Date.now();
			setSessionMeta({
				sessionId: layout.sessionId,
				quizId: bundle.quiz_metadata.quiz_id,
				participantId: studentId
			});

			const ui = await loadUiSettings();
			update(() => ({
				...initialState,
				studentId,
				fullName,
				quizId: bundle.quiz_metadata.quiz_id,
				sessionId,
				orderedBlocks: layout.orderedBlocks,
				currentGlobalIndex: 0,
				answers: {},
				flagged: new Set(),
				startTime: Date.now(),
				durationMinutes: bundle.quiz_metadata.duration_minutes || ui.durationMinutes,
				maxQuestions: ui.maxQuestions,
				proctoringRules: ui.proctoringRules,
				isStarted: true,
				isSubmitted: false,
				jwtToken,
				endsAtMs,
				serverSkewMs: skew,
				securityEventCount: 0
			}));

			await upsertParticipantState(sessionId, studentId, bundle.quiz_metadata.quiz_id, {
				status: 'active',
				current_question_index: 0,
				answered_count: 0,
				time_remaining_seconds: Math.floor((endsAtMs - serverNowMs) / 1000),
				jwt_validation_token: jwtToken
			});
			void triggerSync();
		},
		/** Legacy: init without bundle (kept for compatibility) — prefer unlockAndStartSession */
		init(studentId: string, fullName: string) {
			update((s) => ({
				...s,
				studentId,
				fullName,
				isStarted: true,
				startTime: Date.now()
			}));
		},
		async answer(questionId: string, optionId: string) {
			const s = get({ subscribe });
			if (!s.studentId) return;
			const answers = { ...s.answers, [questionId]: optionId };
			const answeredCount = Object.keys(answers).length;
			update((st) => ({
				...st,
				answers
			}));
			await upsertAnswerRecord(s.sessionId, s.studentId, questionId, { selected_option_id: optionId });
			await upsertParticipantState(s.sessionId, s.studentId, s.quizId, {
				answered_count: answeredCount,
				current_question_index: s.currentGlobalIndex
			});
			void triggerSync();
		},
		async toggleFlag(questionId: string) {
			const s = get({ subscribe });
			if (!s.studentId) return;
			const flagged = new Set(s.flagged);
			let doubtful: boolean;
			if (flagged.has(questionId)) {
				flagged.delete(questionId);
				doubtful = false;
			} else {
				flagged.add(questionId);
				doubtful = true;
			}
			update((st) => ({ ...st, flagged }));
			const opt = s.answers[questionId] ?? '';
			await upsertAnswerRecord(s.sessionId, s.studentId, questionId, {
				selected_option_id: opt,
				is_doubtful: doubtful
			});
			void triggerSync();
		},
		nextQuestion() {
			update((s) => {
				const flat = flattenIndices(s.orderedBlocks);
				if (flat.length === 0) return s;
				const next = Math.min(s.currentGlobalIndex + 1, flat.length - 1);
				queueMicrotask(() => void syncNav(next));
				return { ...s, currentGlobalIndex: next };
			});
		},
		prevQuestion() {
			update((s) => {
				const prev = Math.max(s.currentGlobalIndex - 1, 0);
				queueMicrotask(() => void syncNav(prev));
				return { ...s, currentGlobalIndex: prev };
			});
		},
		goToQuestion(globalIndex: number) {
			update((s) => {
				const flat = flattenIndices(s.orderedBlocks);
				const idx = Math.max(0, Math.min(globalIndex, Math.max(0, flat.length - 1)));
				queueMicrotask(() => void syncNav(idx));
				return { ...s, currentGlobalIndex: idx };
			});
		},
		async addSecurityEvent(
			eventType: 'tab_switched' | 'fullscreen_exited' | 'time_tampering_detected',
			details?: string
		) {
			const s = get({ subscribe });
			if (!s.studentId || !s.quizId) return;
			const db = await getExamDatabase();
			const log_id = `${s.studentId}_${eventType}_${Date.now()}`;
			await db.security_log.insert({
				log_id,
				participant_id: s.studentId,
				quiz_id: s.quizId,
				event_type: eventType,
				timestamp: Date.now(),
				details: details ?? ''
			});
			update((st) => ({ ...st, securityEventCount: st.securityEventCount + 1 }));
			void triggerSync();
		},
		addInfraction() {
			void store.addSecurityEvent('tab_switched');
		},
		async submit() {
			const s = get({ subscribe });
			update((st) => ({ ...st, isSubmitted: true }));
			if (s.studentId && s.quizId && s.sessionId) {
				await upsertParticipantState(s.sessionId, s.studentId, s.quizId, { status: 'submitted' });
			}
			setSessionMeta(null);
			void triggerSync();
		},
		async updateSettings(settings: Partial<{
			durationMinutes: number;
			maxQuestions: number;
			proctoringRules: Partial<ProctoringRules>;
		}>) {
			update((s) => {
				const proctoringRules = {
					...s.proctoringRules,
					...settings.proctoringRules
				};
				return {
					...s,
					durationMinutes: settings.durationMinutes ?? s.durationMinutes,
					maxQuestions: settings.maxQuestions ?? s.maxQuestions,
					proctoringRules
				};
			});
			const s = get({ subscribe });
			await saveUiSettings({
				durationMinutes: s.durationMinutes,
				maxQuestions: s.maxQuestions,
				proctoringRules: s.proctoringRules
			});
		},
		async setJwtTiming(jwt: string, endsAtMs: number, serverNowMs: number) {
			update((s) => ({
				...s,
				jwtToken: jwt,
				endsAtMs,
				serverSkewMs: serverNowMs - Date.now()
			}));

			// Keep participant_state in sync so the operator dashboard receives
			// updated time_remaining_seconds via the normal sync pipeline.
			const s = get({ subscribe });
			if (!s.sessionId || !s.studentId || !s.quizId) return;

			const time_remaining_seconds = Math.max(0, Math.floor((endsAtMs - serverNowMs) / 1000));
			await upsertParticipantState(s.sessionId, s.studentId, s.quizId, {
				jwt_validation_token: jwt,
				time_remaining_seconds
			});
			void triggerSync();
		},
		reset: () => {
			setSessionMeta(null);
			set(initialState);
		}
	};
	return store;
};

export const examStore = createExamStore();

/** Flattened question order for grids (1-based display uses index + 1) */
export function getFlatQuestionRefs(orderedBlocks: ExamState['orderedBlocks']) {
	return flattenIndices(orderedBlocks);
}

/** @deprecated replaced by orderedBlocks from store */
export const mockExamBlocks: import('$lib/types/quiz').ExamBlock[] = [];
