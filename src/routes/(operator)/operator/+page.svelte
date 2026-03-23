<script lang="ts">
	import { onMount } from 'svelte';
	import { Shield, Users, Timer, RefreshCw, LogOut } from 'lucide-svelte';
	import { goto } from '$app/navigation';

	let quizId = 'demo-quiz-001';

	let loading = true;
	let err = '';
	let pollTimer: ReturnType<typeof setInterval> | null = null;
	let payload: {
		metadata: Record<string, unknown>;
		participants: {
			participant_id: string;
			full_name: string;
			status: string;
			current_question_index: number;
			answered_count: number;
			time_remaining_seconds: number;
		}[];
	} | null = null;

	async function load() {
		loading = true;
		err = '';
		try {
			const r = await fetch(`/api/operator/${encodeURIComponent(quizId)}`);
			if (!r.ok) throw new Error('Failed to load');
			payload = await r.json();
		} catch (e) {
			err = e instanceof Error ? e.message : 'Error';
		} finally {
			loading = false;
		}
	}

	async function poll() {
		try {
			const r = await fetch(`/api/operator/${encodeURIComponent(quizId)}`);
			if (!r.ok) return;
			payload = await r.json();
		} catch {
			// Ignore transient network issues while polling.
		}
	}

	onMount(() => {
		void load();
		pollTimer = setInterval(() => void poll(), 3000);
		return () => {
			if (pollTimer) clearInterval(pollTimer);
			pollTimer = null;
		};
	});

	async function manualStart() {
		await fetch(`/api/operator/${encodeURIComponent(quizId)}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ operator_started_manually: true, start_time: Date.now() })
		});
		await load();
	}

	async function logout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		await goto('/login');
	}
</script>

<svelte:head>
	<title>Operator — CBT</title>
</svelte:head>

<div class="min-h-screen bg-surface-container-low p-6 md:p-10">
	<header class="flex flex-wrap items-center justify-between gap-4 mb-10">
		<div class="flex items-center gap-3">
			<div class="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
				<Shield class="text-white w-6 h-6" />
			</div>
			<div>
				<h1 class="text-2xl font-headline font-bold text-primary">Operator dashboard</h1>
				<p class="text-sm text-secondary">
					<label for="qid" class="sr-only">Quiz</label>
					<select
						id="qid"
						bind:value={quizId}
						class="mt-1 rounded-lg border border-outline-variant/30 bg-white px-2 py-1 text-sm font-mono"
						onchange={load}
					>
						<option value="demo-quiz-001">demo-quiz-001</option>
						<option value="mock-quiz-002">mock-quiz-002</option>
					</select>
				</p>
			</div>
		</div>
		<div class="flex gap-2 flex-wrap">
			<button
				type="button"
				class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-outline-variant/20 text-primary font-semibold hover:bg-surface-container"
				onclick={load}
			>
				<RefreshCw class="w-4 h-4" />
				Refresh
			</button>
			<button
				type="button"
				class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white font-semibold"
				onclick={manualStart}
			>
				<Timer class="w-4 h-4" />
				Mark manual start
			</button>
			<button
				type="button"
				class="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-outline-variant/30 text-secondary"
				onclick={logout}
			>
				<LogOut class="w-4 h-4" />
				Log out
			</button>
			<a href="/" class="inline-flex items-center px-4 py-2 rounded-lg text-secondary hover:text-primary">Home</a>
		</div>
	</header>

	{#if loading}
		<p class="text-secondary">Loading…</p>
	{:else if err}
		<p class="text-error font-medium">{err}</p>
	{:else if payload}
		<div class="grid gap-6 md:grid-cols-3 mb-8">
			<div class="rounded-xl bg-white p-6 border border-outline-variant/10 shadow-sm">
				<p class="text-xs font-bold text-secondary uppercase tracking-widest mb-1">Title</p>
				<p class="text-lg font-bold text-primary">{payload.metadata.title}</p>
			</div>
			<div class="rounded-xl bg-white p-6 border border-outline-variant/10 shadow-sm">
				<p class="text-xs font-bold text-secondary uppercase tracking-widest mb-1">Duration</p>
				<p class="text-lg font-bold text-primary">{payload.metadata.duration_minutes} min</p>
			</div>
			<div class="rounded-xl bg-white p-6 border border-outline-variant/10 shadow-sm">
				<p class="text-xs font-bold text-secondary uppercase tracking-widest mb-1">TOTP interval</p>
				<p class="text-lg font-bold text-primary">{payload.metadata.passcode_interval}s</p>
			</div>
		</div>

		<div class="rounded-xl bg-white border border-outline-variant/10 overflow-hidden shadow-sm">
			<div class="px-6 py-4 border-b border-outline-variant/10 flex items-center gap-2">
				<Users class="w-5 h-5 text-primary" />
				<h2 class="font-headline font-bold text-primary">Participants</h2>
			</div>
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="bg-surface-container-low text-left text-secondary text-xs uppercase tracking-wider">
							<th class="px-6 py-3">ID</th>
							<th class="px-6 py-3">Name</th>
							<th class="px-6 py-3">Status</th>
							<th class="px-6 py-3">Current Q index</th>
							<th class="px-6 py-3">Answered</th>
							<th class="px-6 py-3">Time left (s)</th>
						</tr>
					</thead>
					<tbody>
						{#each payload.participants as p, i (i)}
							<tr class="border-t border-outline-variant/10 hover:bg-surface-container-low/50">
								<td class="px-6 py-3 font-mono text-xs">{p.participant_id}</td>
								<td class="px-6 py-3">{p.full_name || '—'}</td>
								<td class="px-6 py-3">{p.status}</td>
								<td class="px-6 py-3 tabular-nums">{p.current_question_index}</td>
								<td class="px-6 py-3 tabular-nums">{p.answered_count}</td>
								<td class="px-6 py-3 tabular-nums">{p.time_remaining_seconds}</td>
							</tr>
						{:else}
							<tr>
								<td colspan="6" class="px-6 py-8 text-center text-secondary"
									>No participants yet. Sync runs when students take the exam online.</td
								>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>
