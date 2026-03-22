import { describe, it, expect } from 'vitest';
import { TOTP } from 'otpauth';
import { verifyTotp } from './totp';

describe('verifyTotp', () => {
	it('accepts current TOTP for seed and interval', () => {
		const secret = 'JBSWY3DPEHPK3PXP';
		const totp = new TOTP({ secret, digits: 6, period: 30, algorithm: 'SHA1' });
		const token = totp.generate();
		expect(verifyTotp(secret, token, 30)).toBe(true);
	});

	it('rejects wrong code', () => {
		expect(verifyTotp('JBSWY3DPEHPK3PXP', '000000', 30)).toBe(false);
	});
});
