import { Lucia } from 'lucia';
import { BetterSqlite3Adapter } from '@lucia-auth/adapter-sqlite';
import { getServerDb } from './db';
import type { UserRole } from './db';

const adapter = new BetterSqlite3Adapter(getServerDb(), {
	user: 'auth_user',
	session: 'auth_session'
});

export const lucia = new Lucia(adapter, {
	sessionCookie: {
		attributes: {
			// `secure: true` cookies are dropped on non-HTTPS. Allow forcing via env.
			secure:
				process.env.SESSION_COOKIE_SECURE === 'true'
					? true
					: process.env.SESSION_COOKIE_SECURE === 'false'
						? false
						: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			path: '/'
		}
	},
	getUserAttributes: (attributes) => {
		return {
			username: attributes.username as string,
			role: attributes.role as UserRole,
			displayName: (attributes.display_name as string) ?? ''
		};
	}
});

declare module 'lucia' {
	interface Register {
		Lucia: typeof lucia;
		DatabaseUserAttributes: {
			username: string;
			role: UserRole;
			display_name: string;
		};
	}
}
