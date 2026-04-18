import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { QuizBundle } from '$lib/types/quiz';
import sampleQuizBundled from '$lib/data/sample-quiz.json';
import extraQuizBundled from '$lib/data/sync-mocks/extra-quiz.json';

export interface ExternalPullResult {
	bundles: QuizBundle[];
}

/** When `src/lib/data` is on disk (typical dev / full-repo deploy), read mocks fresh each sync. */
function loadMockBundlesFromDisk(): QuizBundle[] | null {
	const base = path.join(process.cwd(), 'src/lib/data');
	const samplePath = path.join(base, 'sample-quiz.json');
	const extraPath = path.join(base, 'sync-mocks/extra-quiz.json');
	if (!existsSync(samplePath) || !existsSync(extraPath)) {
		return null;
	}
	return [
		JSON.parse(readFileSync(samplePath, 'utf8')) as QuizBundle,
		JSON.parse(readFileSync(extraPath, 'utf8')) as QuizBundle
	];
}

/**
 * Simulates a third-party “pull quizzes” API. Set `EXTERNAL_SYNC_MOCK=false` and
 * `EXTERNAL_SYNC_BASE_URL` (+ optional `EXTERNAL_SYNC_API_KEY`) for a real HTTP pull later.
 */
export async function pullQuizzesFromExternal(): Promise<ExternalPullResult> {
	const useMock = process.env.EXTERNAL_SYNC_MOCK !== 'false';
	if (useMock) {
		const fromDisk = loadMockBundlesFromDisk();
		if (fromDisk) {
			return { bundles: fromDisk };
		}
		return {
			bundles: [
				sampleQuizBundled as unknown as QuizBundle,
				extraQuizBundled as unknown as QuizBundle
			]
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
