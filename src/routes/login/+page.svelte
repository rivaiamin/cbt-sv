<script lang="ts">
	import { Shield, KeyRound } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let username = '';
	let password = '';
	let error = '';
	let loading = false;

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		loading = true;
		try {
			const r = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ username, password })
			});
			const j = await r.json().catch(() => ({}));
			if (!r.ok) {
				error = (j as { error?: string }).error ?? 'Login failed';
				return;
			}
			const role = (j as { role?: string }).role;
			const redir = $page.url.searchParams.get('redirect');
			const navOpts = { invalidateAll: true as const };
			if (redir && redir.startsWith('/')) {
				await goto(redir, navOpts);
				return;
			}
			if (role === 'participant') await goto('/participant', navOpts);
			else if (role === 'operator') await goto('/operator', navOpts);
			else if (role === 'admin') await goto('/admin', navOpts);
			else await goto('/', navOpts);
		} catch {
			error = 'Network error';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Sign in — CBT</title>
</svelte:head>

<div class="min-h-screen flex flex-col items-center justify-center px-6 py-16 bg-surface-container-low">
	<div class="w-full max-w-md space-y-8">
		<div class="flex flex-col items-center gap-3">
			<div class="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
				<Shield class="text-white w-7 h-7" />
			</div>
			<h1 class="text-2xl font-headline font-bold text-primary">Sign in</h1>
			<p class="text-sm text-on-surface-variant text-center">
				Use seeded accounts: <code class="text-primary">student</code> / <code class="text-primary">operator</code> / <code class="text-primary">admin</code> — password
				<code class="text-primary">changeme123</code> (override with <code class="text-primary">SEED_PASSWORD</code>).
			</p>
		</div>

		<form class="space-y-4" onsubmit={handleSubmit}>
			<div class="space-y-1">
				<label for="user" class="text-xs font-semibold text-secondary uppercase tracking-wider">Username</label>
				<input
					id="user"
					bind:value={username}
					autocomplete="username"
					class="w-full h-12 px-4 rounded-lg border border-outline-variant/30 bg-white"
					required
				/>
			</div>
			<div class="space-y-1">
				<label for="pw" class="text-xs font-semibold text-secondary uppercase tracking-wider">Password</label>
				<input
					id="pw"
					type="password"
					bind:value={password}
					autocomplete="current-password"
					class="w-full h-12 px-4 rounded-lg border border-outline-variant/30 bg-white"
					required
				/>
			</div>
			{#if error}
				<p class="text-error text-sm font-medium">{error}</p>
			{/if}
			<button
				type="submit"
				disabled={loading}
				class="w-full h-12 rounded-xl bg-primary text-white font-bold flex items-center justify-center gap-2 disabled:opacity-60"
			>
				<KeyRound class="w-5 h-5" />
				{loading ? 'Signing in…' : 'Sign in'}
			</button>
		</form>

		<p class="text-center text-sm">
			<a href="/" class="text-primary font-medium hover:underline">Back to home</a>
		</p>
	</div>
</div>
