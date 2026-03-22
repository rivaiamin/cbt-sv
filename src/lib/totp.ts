import { TOTP } from 'otpauth';

/**
 * Verify a 6-digit TOTP using base32-encoded seed (RFC 4648) and interval in seconds.
 */
export function verifyTotp(seedBase32: string, code: string, intervalSeconds: number): boolean {
	const digits = code.replace(/\s/g, '');
	if (!/^\d{6}$/.test(digits)) return false;
	const totp = new TOTP({
		secret: seedBase32,
		digits: 6,
		period: intervalSeconds,
		algorithm: 'SHA1'
	});
	const delta = totp.validate({ token: digits, window: 1 });
	return delta !== null;
}
