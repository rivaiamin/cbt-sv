import { describe, it, expect } from 'vitest';
import { shuffleArray } from './shuffle';

describe('shuffleArray', () => {
	it('preserves length and elements', () => {
		const a = [1, 2, 3, 4, 5];
		const s = shuffleArray(a);
		expect(s.length).toBe(a.length);
		expect([...s].sort()).toEqual([...a].sort());
	});
});
