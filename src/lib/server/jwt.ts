import { SignJWT, jwtVerify } from 'jose';
import { env } from '$env/dynamic/private';

function getSecret(): Uint8Array {
	const s = env.JWT_SECRET ?? 'dev-cbt-jwt-secret-change-in-production';
	return new TextEncoder().encode(s);
}

export interface SessionJwtPayload {
	sub: string;
	quiz_id: string;
	/** Exam attempt id (RxDB session / participant_states.session_id) */
	session_id: string;
	full_name?: string;
	server_now: number;
	ends_at: number;
}

export async function signSessionJwt(payload: SessionJwtPayload, ttlSeconds: number): Promise<string> {
	const nowSec = Math.floor(Date.now() / 1000);
	return new SignJWT({
		quiz_id: payload.quiz_id,
		session_id: payload.session_id,
		full_name: payload.full_name,
		server_now: payload.server_now,
		ends_at: payload.ends_at
	})
		.setProtectedHeader({ alg: 'HS256' })
		.setSubject(payload.sub)
		.setIssuedAt(nowSec)
		.setExpirationTime(nowSec + ttlSeconds)
		.sign(getSecret());
}

export async function verifySessionJwt(token: string): Promise<SessionJwtPayload & { exp: number }> {
	const { payload } = await jwtVerify(token, getSecret(), { algorithms: ['HS256'] });
	return payload as unknown as SessionJwtPayload & { exp: number };
}
