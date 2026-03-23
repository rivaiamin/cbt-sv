import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { lucia } from '$lib/server/auth';
import { getServerDb, verifyUserPassword } from '$lib/server/db';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	const username = body?.username as string | undefined;
	const password = body?.password as string | undefined;

	if (!username || !password) {
		return json({ error: 'username and password required' }, { status: 400 });
	}

	const db = getServerDb();
	const row = db.prepare(`SELECT id, password_hash, role FROM auth_user WHERE username = ?`).get(username) as
		| {
				id: string;
				password_hash: string;
				role: string;
		  }
		| undefined;

	if (!row) {
		return json({ error: 'Invalid credentials' }, { status: 401 });
	}

	const ok = await verifyUserPassword(row.password_hash, password);
	if (!ok) {
		return json({ error: 'Invalid credentials' }, { status: 401 });
	}

	const session = await lucia.createSession(row.id, {});
	const sessionCookie = lucia.createSessionCookie(session.id);

	return json(
		{ ok: true, role: row.role },
		{
			status: 200,
			headers: {
				'Set-Cookie': sessionCookie.serialize()
			}
		}
	);
};
