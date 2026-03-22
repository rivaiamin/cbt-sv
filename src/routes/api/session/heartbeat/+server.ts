import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifySessionJwt, signSessionJwt } from '$lib/server/jwt';
import { getServerDb } from '$lib/server/db';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	const token = body?.token as string | undefined;
	if (!token) throw error(400, 'token required');

	let payload;
	try {
		payload = await verifySessionJwt(token);
	} catch {
		throw error(401, 'invalid token');
	}

	const server_now = Date.now();
	const db = getServerDb();

	const remainingMs = Math.max(0, payload.ends_at - server_now);
	const ttlSeconds = Math.ceil(remainingMs / 1000) + 60;

	const newToken = await signSessionJwt(
		{
			sub: payload.sub,
			quiz_id: payload.quiz_id,
			full_name: payload.full_name,
			server_now,
			ends_at: payload.ends_at
		},
		Math.max(ttlSeconds, 120)
	);

	db.prepare(`UPDATE participant_states SET jwt_validation_token = ?, time_remaining_seconds = ? WHERE participant_id = ?`).run(
		newToken,
		Math.floor(remainingMs / 1000),
		payload.sub
	);

	return json({
		token: newToken,
		server_now,
		ends_at: payload.ends_at,
		time_remaining_seconds: Math.floor(remainingMs / 1000)
	});
};
