/**
 * Server-side encrypt (Node/Web Crypto) — must match client `decryptQuizPayload` in `crypto/payload.ts`.
 */
const SALT = 'cbt-payload-v1';
const PBKDF2_ITERS = 100000;

function getCrypto(): Crypto {
	if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
		return globalThis.crypto as Crypto;
	}
	throw new Error('Web Crypto not available');
}

async function deriveAesKey(seedBase32: string): Promise<CryptoKey> {
	const enc = new TextEncoder();
	const baseKey = await getCrypto().subtle.importKey(
		'raw',
		enc.encode(seedBase32),
		'PBKDF2',
		false,
		['deriveKey']
	);
	return getCrypto().subtle.deriveKey(
		{
			name: 'PBKDF2',
			salt: enc.encode(SALT),
			iterations: PBKDF2_ITERS,
			hash: 'SHA-256'
		},
		baseKey,
		{ name: 'AES-GCM', length: 256 },
		false,
		['encrypt']
	);
}

export async function encryptQuizPayload(seedBase32: string, plaintext: string): Promise<string> {
	const iv = getCrypto().getRandomValues(new Uint8Array(12));
	const key = await deriveAesKey(seedBase32);
	const cipher = await getCrypto().subtle.encrypt(
		{ name: 'AES-GCM', iv },
		key,
		new TextEncoder().encode(plaintext)
	);
	const combined = new Uint8Array(iv.length + cipher.byteLength);
	combined.set(iv);
	combined.set(new Uint8Array(cipher), iv.length);
	return Buffer.from(combined).toString('base64');
}
