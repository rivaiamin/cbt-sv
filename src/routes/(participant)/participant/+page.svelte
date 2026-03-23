<script lang="ts">
	import { onMount } from 'svelte';
	import { ClipboardList, ArrowRight, LogOut } from 'lucide-svelte';
	import { goto } from '$app/navigation';

	type Row = {
		quiz_id: string;
		title: string;
		start_time: number;
		duration_minutes: number;
		status: string;
	};

	let assignments: Row[] = [];
	let loading = true;
	let err = '';

	onMount(async () => {
		try {
			const r = await fetch('/api/participant/assignments');
			if (!r.ok) throw new Error('Failed to load');
			const j = await r.json();
			assignments = j.assignments ?? [];
		} catch (e) {
			err = e instanceof Error ? e.message : 'Error';
		} finally {
			loading = false;
		}
	});

	async function logout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		await goto('/login');
	}
</script>

<svelte:head>
	<title>My tests — CBT</title>
</svelte:head>

<div class="min-h-screen bg-surface-container-low p-6 md:p-10 max-w-3xl mx-auto">
	<header class="flex flex-wrap items-center justify-between gap-4 mb-10">
		<div class="flex items-center gap-3">
			<div class="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
				<ClipboardList class="text-white w-6 h-6" />
			</div>
			<div>
				<h1 class="text-2xl font-headline font-bold text-primary">Incoming tests</h1>
				<p class="text-sm text-secondary">Assigned quizzes for your account</p>
			</div>
		</div>
		<button
			type="button"
			class="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-outline-variant/30 text-secondary hover:text-primary"
			onclick={logout}
		>
			<LogOut class="w-4 h-4" />
			Log out
		</button>
	</header>

	{#if loading}
		<p class="text-secondary">Loading…</p>
	{:else if err}
		<p class="text-error">{err}</p>
	{:else if assignments.length === 0}
		<p class="text-secondary">No quizzes assigned yet. Ask an administrator to sync content and assign you.</p>
	{:else}
		<ul class="space-y-3">
			{#each assignments as a (a.quiz_id)}
				<li
					class="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white border border-outline-variant/15 p-5 shadow-sm"
				>
					<div>
						<p class="font-headline font-bold text-primary">{a.title}</p>
						<p class="text-xs text-secondary mt-1">
							{a.quiz_id} · {a.duration_minutes} min · status: {a.status}
						</p>
					</div>
					{#if a.status === 'scheduled' || a.status === 'in_progress'}
						<a
							href="/exam/{a.quiz_id}"
							class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white font-semibold text-sm"
						>
							Open
							<ArrowRight class="w-4 h-4" />
						</a>
					{:else}
						<span class="text-sm text-secondary">{a.status}</span>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}

	<p class="mt-10 text-sm text-secondary">
		<a href="/settings" class="text-primary hover:underline">Proctoring settings</a>
		·
		<a href="/review" class="text-primary hover:underline">Last review</a>
	</p>
</div>
