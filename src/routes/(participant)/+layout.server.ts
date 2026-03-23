import { redirect } from '@sveltejs/kit';
import type { ServerLoad } from '@sveltejs/kit';
import type { ParticipantLayoutData } from '$lib/types/participantLayout';

/** Uses `ServerLoad` from `@sveltejs/kit` instead of generated `LayoutServerLoad` so IDEs resolve types without `./$types`. */
export const load: ServerLoad = async ({ locals, url }): Promise<ParticipantLayoutData> => {
	if (!locals.user) {
		throw redirect(303, `/login?redirect=${encodeURIComponent(url.pathname)}`);
	}
	if (locals.user.role !== 'participant') {
		throw redirect(303, '/');
	}
	return {
		user: {
			id: locals.user.id,
			username: locals.user.username,
			displayName: locals.user.displayName
		}
	};
};
