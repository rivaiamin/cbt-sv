<script lang="ts">
	import { Shield, RefreshCw, LogOut } from 'lucide-svelte';
	import { goto } from '$app/navigation';

	let syncing = false;
	let msg = '';

	async function runSync() {
		syncing = true;
		msg = '';
		try {
			const r = await fetch('/api/admin/sync', { method: 'POST' });
			const j = await r.json().catch(() => ({}));
			if (!r.ok) throw new Error((j as { message?: string }).message ?? 'Sync failed');
			msg = `Imported ${(j as { imported?: number }).imported ?? 0} quiz bundle(s).`;
		} catch (e) {
			msg = e instanceof Error ? e.message : 'Error';
		} finally {
			syncing = false;
		}
	}

	async function logout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		await goto('/login');
	}
</script>

<svelte:head>
	<title>Admin — CBT</title>
</svelte:head>

<div class="min-h-screen bg-surface-container-low p-6 md:p-10 max-w-2xl mx-auto">
	<header class="flex flex-wrap items-center justify-between gap-4 mb-10">
		<div class="flex items-center gap-3">
			<div class="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
				<Shield class="text-white w-6 h-6" />
			</div>
			<div>
				<h1 class="text-2xl font-headline font-bold text-primary">Admin</h1>
				<p class="text-sm text-secondary">Pull quiz content (mock external API by default)</p>
			</div>
		</div>
		<button
			type="button"
			class="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-outline-variant/30"
			onclick={logout}
		>
			<LogOut class="w-4 h-4" />
			Log out
		</button>
	</header>

	<div class="rounded-xl bg-white border border-outline-variant/15 p-6 space-y-4">
		<p class="text-sm text-on-surface-variant">
			Runs <code class="text-primary">pullQuizzesFromExternal()</code> — mock fixtures unless
			<code class="text-primary">EXTERNAL_SYNC_MOCK=false</code> and a base URL is set.
		</p>
		<button
			type="button"
			disabled={syncing}
			class="inline-flex items-center gap-2 px-4 py-3 rounded-lg bg-primary text-white font-semibold disabled:opacity-60"
			onclick={runSync}
		>
			<RefreshCw class="w-4 h-4 {syncing ? 'animate-spin' : ''}" />
			{syncing ? 'Syncing…' : 'Run sync'}
		</button>
		{#if msg}
			<p class="text-sm font-medium text-primary">{msg}</p>
		{/if}
	</div>

	<p class="mt-8 text-sm">
		<a href="/" class="text-primary hover:underline">Home</a>
	</p>
</div>
