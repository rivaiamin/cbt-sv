import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listAssignmentsForUser } from '$lib/server/assignments';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}
	if (locals.user.role !== 'participant') {
		throw error(403, 'Participants only');
	}

	const rows = listAssignmentsForUser(locals.user.id);
	return json({ assignments: rows });
};
