import type { Handle } from '@sveltejs/kit';
import { lucia } from '$lib/server/auth';
import { seedDevUsersIfEmpty } from '$lib/server/db';

let seeded = false;

export const handle: Handle = async ({ event, resolve }) => {
	if (!seeded) {
		seeded = true;
		await seedDevUsersIfEmpty();
	}

	const sessionId = lucia.readSessionCookie(event.request.headers.get('Cookie') ?? '');
	if (!sessionId) {
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	const { session, user } = await lucia.validateSession(sessionId);
	if (!session) {
		event.locals.user = null;
		event.locals.session = null;
		const response = await resolve(event);
		response.headers.append('Set-Cookie', lucia.createBlankSessionCookie().serialize());
		return response;
	}

	event.locals.user = user;
	event.locals.session = session;

	const response = await resolve(event);
	if (session.fresh) {
		response.headers.append('Set-Cookie', lucia.createSessionCookie(session.id).serialize());
	}
	return response;
};
