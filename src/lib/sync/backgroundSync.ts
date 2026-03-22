import { browser } from '$app/environment';
import { getExamDatabase } from '$lib/db/client';

let syncTimer: ReturnType<typeof setInterval> | null = null;

export function startBackgroundSync(intervalMs = 15000): void {
	if (!browser || syncTimer) return;
	syncTimer = setInterval(() => {
		void triggerSync();
	}, intervalMs);
}

export function stopBackgroundSync(): void {
	if (syncTimer) {
		clearInterval(syncTimer);
		syncTimer = null;
	}
}

export async function triggerSync(): Promise<void> {
	if (!browser) return;
	try {
		const db = await getExamDatabase();
		const answers = await db.answer_record.find().exec();
		const states = await db.participant_state.find().exec();
		const logs = await db.security_log.find().exec();

		const payload = {
			answer_records: answers.map((d) => d.toMutableJSON()),
			participant_states: states.map((d) => d.toMutableJSON()),
			security_logs: logs.map((d) => d.toMutableJSON())
		};

		const res = await fetch('/api/sync', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});
		if (!res.ok) {
			console.warn('Sync failed', res.status);
		}
	} catch (e) {
		console.warn('Sync error', e);
	}
}
