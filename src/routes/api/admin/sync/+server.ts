import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getServerDb } from '$lib/server/db';
import { encryptQuizPayload } from '$lib/server/payloadCrypto';
import { pullQuizzesFromExternal } from '$lib/server/sync/pullExternal';

export const POST: RequestHandler = async ({ locals }) => {
	if (!locals.user || locals.user.role !== 'admin') {
		throw error(403, 'Admin only');
	}

	const { bundles } = await pullQuizzesFromExternal();
	const db = getServerDb();

	for (const bundle of bundles) {
		const meta = bundle.quiz_metadata;
		const plaintext = JSON.stringify(bundle);
		const encrypted_payload = await encryptQuizPayload(meta.passcode_seed, plaintext);
		db.prepare(
			`INSERT OR REPLACE INTO quiz_metadata (quiz_id, title, start_time, duration_minutes, passcode_seed, passcode_interval, operator_started_manually, encrypted_payload, status, source, external_ref)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', 'external_pull', ?)`
		).run(
			meta.quiz_id,
			meta.title,
			meta.start_time,
			meta.duration_minutes,
			meta.passcode_seed,
			meta.passcode_interval,
			meta.operator_started_manually ? 1 : 0,
			encrypted_payload,
			meta.quiz_id
		);
	}

	return json({ ok: true, imported: bundles.length });
};
