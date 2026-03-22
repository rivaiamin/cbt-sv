import { getExamDatabase } from './client';
import type { ProctoringRules } from '$lib/types/exam';

const DOC_ID = 'global';

const defaultProctoring: ProctoringRules = {
	tabSwitchDetection: true,
	rightClickDisabled: true,
	fullscreenRequired: false
};

export async function loadUiSettings(): Promise<{
	durationMinutes: number;
	maxQuestions: number;
	proctoringRules: ProctoringRules;
}> {
	const db = await getExamDatabase();
	const doc = await db.ui_settings.findOne(DOC_ID).exec();
	if (!doc) {
		return {
			durationMinutes: 120,
			maxQuestions: 50,
			proctoringRules: { ...defaultProctoring }
		};
	}
	const d = doc.toMutableJSON();
	return {
		durationMinutes: d.duration_minutes,
		maxQuestions: d.max_questions,
		proctoringRules: JSON.parse(d.proctoring_json) as ProctoringRules
	};
}

export async function saveUiSettings(settings: {
	durationMinutes: number;
	maxQuestions: number;
	proctoringRules: ProctoringRules;
}): Promise<void> {
	const db = await getExamDatabase();
	await db.ui_settings.upsert({
		id: DOC_ID,
		duration_minutes: settings.durationMinutes,
		max_questions: settings.maxQuestions,
		proctoring_json: JSON.stringify(settings.proctoringRules)
	});
}
