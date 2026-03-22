export type TimerWorkerIn = { type: 'init'; endsAtMs: number; serverSkewMs: number };
export type TimerWorkerOut = { type: 'tick'; remainingMs: number; remainingFormatted: string };

let timer: ReturnType<typeof setInterval> | null = null;

function format(ms: number): string {
	const s = Math.max(0, Math.floor(ms / 1000));
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	const sec = s % 60;
	return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

self.onmessage = (ev: MessageEvent<TimerWorkerIn>) => {
	const msg = ev.data;
	if (msg.type !== 'init') return;
	if (timer) {
		clearInterval(timer);
		timer = null;
	}
	const endsAt = msg.endsAtMs;
	const skew = msg.serverSkewMs;
	const tick = () => {
		const now = Date.now() + skew;
		const remainingMs = Math.max(0, endsAt - now);
		const out: TimerWorkerOut = {
			type: 'tick',
			remainingMs,
			remainingFormatted: format(remainingMs)
		};
		self.postMessage(out);
	};
	tick();
	timer = setInterval(tick, 1000);
};
