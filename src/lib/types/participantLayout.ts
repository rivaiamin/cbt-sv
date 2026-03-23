/**
 * Mirrors the return value of `(participant)/+layout.server.ts`.
 * Child pages under `(participant)/` inherit this as their `data` when they have no own `load`.
 */
export type ParticipantLayoutData = {
	user: {
		id: string;
		username: string;
		displayName: string;
	};
};
