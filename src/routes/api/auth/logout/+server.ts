import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { lucia } from '$lib/server/auth';

export const POST: RequestHandler = async ({ locals }) => {
	if (!locals.session) {
		return json({ ok: true });
	}

	await lucia.invalidateSession(locals.session.id);
	const blank = lucia.createBlankSessionCookie();
	return json(
		{ ok: true },
		{
			headers: {
				'Set-Cookie': blank.serialize()
			}
		}
	);
};
