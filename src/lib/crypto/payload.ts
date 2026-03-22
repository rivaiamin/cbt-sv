const SALT = 'cbt-payload-v1';
const PBKDF2_ITERS = 100000;

function encoder() {
	return new TextEncoder();
}

async function deriveAesKey(seedBase32: string): Promise<CryptoKey> {
	const baseKey = await crypto.subtle.importKey(
		'raw',
		encoder().encode(seedBase32),
		'PBKDF2',
		false,
		['deriveKey']
	);
	return crypto.subtle.deriveKey(
		{
			name: 'PBKDF2',
			salt: encoder().encode(SALT),
			iterations: PBKDF2_ITERS,
			hash: 'SHA-256'
		},
		baseKey,
		{ name: 'AES-GCM', length: 256 },
		false,
		['decrypt']
	);
}

/** Decrypt payload produced by server: 12-byte IV + ciphertext (same derivation as encrypt on server). */
export async function decryptQuizPayload(seedBase32: string, combinedBase64: string): Promise<string> {
	const raw = Uint8Array.from(atob(combinedBase64), (c) => c.charCodeAt(0));
	if (raw.length < 13) throw new Error('Invalid ciphertext');
	const iv = raw.slice(0, 12);
	const ciphertext = raw.slice(12);
	const key = await deriveAesKey(seedBase32);
	const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
	return new TextDecoder().decode(plain);
}
