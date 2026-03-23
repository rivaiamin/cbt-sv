import type { QuizBundle } from '$lib/types/quiz';
import sampleQuiz from '$lib/data/sample-quiz.json';
import extraQuiz from '$lib/data/sync-mocks/extra-quiz.json';

export interface ExternalPullResult {
	bundles: QuizBundle[];
}

/**
 * Simulates a third-party “pull quizzes” API. Set `EXTERNAL_SYNC_MOCK=false` and
 * `EXTERNAL_SYNC_BASE_URL` (+ optional `EXTERNAL_SYNC_API_KEY`) for a real HTTP pull later.
 */
export async function pullQuizzesFromExternal(): Promise<ExternalPullResult> {
	const useMock = process.env.EXTERNAL_SYNC_MOCK !== 'false';
	if (useMock) {
		return {
			bundles: [sampleQuiz as unknown as QuizBundle, extraQuiz as unknown as QuizBundle]
		};
	}

	const base = process.env.EXTERNAL_SYNC_BASE_URL?.replace(/\/$/, '');
	if (!base) {
		return { bundles: [] };
	}

	const headers: Record<string, string> = { Accept: 'application/json' };
	const key = process.env.EXTERNAL_SYNC_API_KEY;
	if (key) {
		headers.Authorization = `Bearer ${key}`;
	}

	const res = await fetch(`${base}/quizzes`, { headers });
	if (!res.ok) {
		throw new Error(`External sync failed: ${res.status}`);
	}
	const data = (await res.json()) as { bundles?: QuizBundle[] };
	return { bundles: data.bundles ?? [] };
}
