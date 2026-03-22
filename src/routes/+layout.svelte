<script>
	import '../index.css';
	import { onMount } from 'svelte';
	import { examStore } from '$lib/examStore';
	import { browser } from '$app/environment';

	/** @type {{ children: import('svelte').Snippet }} */
	let { children } = $props();

	onMount(() => {
		if (browser) {
			const handleVisibilityChange = () => {
				if (document.hidden && $examStore.isStarted && !$examStore.isSubmitted) {
					examStore.addInfraction();
					console.warn('Tab switch detected. Infraction recorded.');
				}
			};

			document.addEventListener('visibilitychange', handleVisibilityChange);
			return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
		}
	});
</script>

<svelte:head>
	<title>Resilient Focus CBT</title>
</svelte:head>

<div class="min-h-screen flex flex-col">
	{@render children()}
</div>
