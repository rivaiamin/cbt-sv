<script lang="ts">
	import { Shield, WifiOff, KeyRound, HelpCircle, ArrowRight, ClipboardCheck, MousePointer2, CloudOff, Timer, Info, UserCircle } from 'lucide-svelte';
	import { examStore } from '$lib/examStore';
	import { goto } from '$app/navigation';
	import { verifyTotp } from '$lib/totp';
	import { decryptQuizPayload } from '$lib/crypto/payload';
	import type { QuizBundle } from '$lib/types/quiz';

	let studentId = '';
	let fullName = '';
	let passcode = '';
	let error = '';
	let loading = false;
	let passcodeIntervalSec = 30;

	async function enterFullscreen() {
		const elem = document.documentElement;
		try {
			if (elem.requestFullscreen) {
				await elem.requestFullscreen();
			// @ts-expect-error: vendor-prefixed fullscreen properties
			} else if (elem.webkitRequestFullscreen) {
				// @ts-expect-error: vendor-prefixed fullscreen properties
				await elem.webkitRequestFullscreen();
			// @ts-expect-error: vendor-prefixed fullscreen properties
			} else if (elem.msRequestFullscreen) {
				// @ts-expect-error: vendor-prefixed fullscreen properties
				await elem.msRequestFullscreen();
			}
		} catch (err) {
			console.error('Error attempting to enable full-screen mode:', err);
			return false;
		}
		return true;
	}

	async function handleStart() {
		error = '';
		const code = passcode.replace(/\s/g, '');
		if (!studentId || !fullName || code.length !== 6) {
			error = 'Please fill all fields correctly.';
			return;
		}

		if ($examStore.proctoringRules.fullscreenRequired) {
			const success = await enterFullscreen();
			if (!success) {
				error = 'Fullscreen mode is required to start the exam. Please ensure your browser supports it and try again.';
				return;
			}
		}

		loading = true;
		try {
			const q = await fetch('/api/quiz');
			if (!q.ok) throw new Error('Failed to load quiz bundle');
			const { metadata, encrypted_payload } = await q.json();
			passcodeIntervalSec = metadata.passcode_interval ?? 30;

			if (!verifyTotp(metadata.passcode_seed, code, passcodeIntervalSec)) {
				error = 'Invalid or expired passcode.';
				return;
			}

			const plain = await decryptQuizPayload(metadata.passcode_seed, encrypted_payload);
			const bundle = JSON.parse(plain) as QuizBundle;

			const sess = await fetch('/api/session/start', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					participant_id: studentId,
					full_name: fullName,
					quiz_id: metadata.quiz_id
				})
			});
			if (!sess.ok) throw new Error('Could not start server session');
			const { token, server_now, ends_at } = await sess.json();

			await examStore.unlockAndStartSession({
				studentId,
				fullName,
				bundle,
				jwtToken: token,
				endsAtMs: ends_at,
				serverNowMs: server_now
			});
			await goto('/exam');
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not start exam';
		} finally {
			loading = false;
		}
	}
</script>

<header class="fixed top-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-surface-container-low">
	<div class="flex items-center gap-3">
		<div class="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
			<Shield class="text-white w-5 h-5" />
		</div>
		<span class="text-xl font-headline font-bold text-primary tracking-tight">Resilient Focus CBT</span>
	</div>
	<div class="flex items-center gap-4">
		<div class="hidden md:flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded-full">
			<WifiOff class="w-4 h-4 text-primary" />
			<span class="text-xs font-medium text-on-surface-variant">System Offline Ready</span>
		</div>
	</div>
</header>

<main class="w-full max-w-5xl px-6 pt-32 pb-20 mx-auto flex flex-col md:flex-row gap-12 items-start justify-center">
	<div class="flex-1 w-full space-y-8">
		<div class="space-y-4">
			<h1 class="text-4xl font-headline font-extrabold text-primary tracking-tight">Secure Exam Access</h1>
			<p class="text-on-surface-variant max-w-md">Verify your identity and enter the TOTP code from your authenticator (same interval as the operator dashboard).</p>
		</div>

		<form class="space-y-6" onsubmit={(e) => { e.preventDefault(); handleStart(); }}>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div class="space-y-1.5">
					<label for="student-id" class="text-xs font-semibold text-secondary uppercase tracking-wider">Student ID</label>
					<input 
						id="student-id"
						bind:value={studentId}
						class="w-full h-12 px-4 bg-white border-0 border-b-2 border-transparent focus:ring-0 focus:border-primary transition-all font-medium text-primary rounded-t-lg" 
						placeholder="e.g. STU-9920-X" 
						type="text"
					/>
				</div>
				<div class="space-y-1.5">
					<label for="full-name" class="text-xs font-semibold text-secondary uppercase tracking-wider">Full Name</label>
					<input 
						id="full-name"
						bind:value={fullName}
						class="w-full h-12 px-4 bg-white border-0 border-b-2 border-transparent focus:ring-0 focus:border-primary transition-all font-medium text-primary rounded-t-lg" 
						placeholder="As per registration" 
						type="text"
					/>
				</div>
			</div>

			<div class="p-6 rounded-xl bg-surface-container-highest border border-outline-variant/20 space-y-4">
				<div class="flex items-center gap-3">
					<KeyRound class="text-primary w-5 h-5" />
					<h2 class="text-lg font-headline font-bold text-primary">Enter TOTP Passcode</h2>
				</div>
				<div class="relative">
					<label for="passcode" class="sr-only">Passcode</label>
					<input 
						id="passcode"
						bind:value={passcode}
						maxlength="6"
						inputmode="numeric"
						autocomplete="one-time-code"
						class="w-full h-16 text-center text-3xl font-headline font-bold tracking-[0.5em] bg-white border-0 border-b-2 border-primary focus:ring-0 transition-all placeholder:opacity-30 uppercase rounded-t-lg" 
						placeholder="000000" 
						type="text"
					/>
					<div class="absolute right-4 top-1/2 -translate-y-1/2 flex items-center text-tertiary">
						<HelpCircle class="w-5 h-5" />
					</div>
				</div>
				<p class="text-xs text-on-surface-variant font-medium">Code rotates every {passcodeIntervalSec} seconds (TOTP).</p>
			</div>

			{#if error}
				<p class="text-error text-sm font-bold">{error}</p>
			{/if}

			<button 
				type="submit"
				disabled={loading}
				class="w-full h-14 rounded-xl bg-gradient-to-br from-primary to-primary-container text-white font-headline font-bold text-lg flex items-center justify-center gap-2 shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-60"
			>
				{loading ? 'Starting…' : 'Start Exam'}
				<ArrowRight class="w-5 h-5" />
			</button>
		</form>
	</div>

	<aside class="w-full md:w-80 space-y-6">
		<div class="bg-surface-container-low rounded-xl p-8 space-y-6">
			<div class="flex items-center gap-2 border-b border-outline-variant/30 pb-4">
				<ClipboardCheck class="text-primary w-5 h-5" />
				<h3 class="font-headline font-bold text-primary">Exam Instructions</h3>
			</div>
			<ul class="space-y-6">
				<li class="flex gap-4">
					<div class="mt-1 w-6 h-6 flex items-center justify-center rounded-full bg-error-container text-error">
						<span class="text-[10px] font-bold">!</span>
					</div>
					<div class="space-y-1">
						<p class="text-sm font-bold text-primary">No Tab Switching</p>
						<p class="text-xs text-on-surface-variant leading-relaxed">Leaving this tab records a security event and syncs to the operator.</p>
					</div>
				</li>
				<li class="flex gap-4">
					<div class="mt-1 w-6 h-6 flex items-center justify-center rounded-full bg-error-container text-error">
						<MousePointer2 class="w-3 h-3" />
					</div>
					<div class="space-y-1">
						<p class="text-sm font-bold text-primary">No Right-Clicking</p>
						<p class="text-xs text-on-surface-variant leading-relaxed">Context menus are disabled during the exam when enabled in settings.</p>
					</div>
				</li>
				<li class="flex gap-4">
					<div class="mt-1 w-6 h-6 flex items-center justify-center rounded-full bg-primary-container text-white">
						<CloudOff class="w-3 h-3" />
					</div>
					<div class="space-y-1">
						<p class="text-sm font-bold text-primary">Offline-First Engine</p>
						<p class="text-xs text-on-surface-variant leading-relaxed">Answers persist in IndexedDB (RxDB) and sync when online.</p>
					</div>
				</li>
			</ul>
			<div class="pt-4 mt-2">
				<div class="flex items-center gap-3 p-3 rounded-lg bg-surface-container-highest">
					<Timer class="text-secondary w-5 h-5" />
					<div>
						<p class="text-[10px] font-bold text-secondary uppercase tracking-widest">Default duration</p>
						<p class="text-sm font-bold text-primary">{$examStore.durationMinutes} Minutes (from settings)</p>
					</div>
				</div>
			</div>
		</div>

		<div class="p-4 rounded-xl border border-dashed border-outline-variant flex items-start gap-3">
			<Info class="text-secondary w-5 h-5 flex-shrink-0" />
			<p class="text-xs text-on-surface-variant leading-normal">
				Use Google Authenticator or any TOTP app with the operator-provided seed to generate codes.
			</p>
		</div>
	</aside>
</main>

<footer class="mt-auto w-full max-w-5xl px-6 py-8 border-t border-surface-container flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-medium text-slate-500 mx-auto">
	<div class="flex items-center gap-6">
		<span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-emerald-500"></span> System Ready</span>
		<a class="hover:text-primary transition-colors" href="/operator">Operator</a>
	</div>
	<div class="flex items-center gap-6">
		<a class="hover:text-primary transition-colors" href="/settings">Settings</a>
	</div>
</footer>

<div class="fixed bottom-6 right-6 z-50">
	<div class="glass-hud p-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/40">
		<div class="flex flex-col">
			<span class="text-[10px] font-bold text-primary/60 uppercase tracking-widest">Exam ID</span>
			<span class="text-sm font-headline font-bold text-primary">demo-quiz-001</span>
		</div>
		<div class="h-8 w-[1px] bg-primary/10"></div>
		<div class="flex items-center gap-2">
			<UserCircle class="text-primary w-6 h-6" />
			<span class="text-xs font-semibold text-primary">Local-first sync</span>
		</div>
	</div>
</div>
