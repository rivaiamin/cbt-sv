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
				if (document.hidden && $examStore.isStarted && !$examStore.isSubmitted && $examStore.proctoringRules.tabSwitchDetection) {
					examStore.addInfraction();
					console.warn('Tab switch detected. Infraction recorded.');
				}
			};

			const handleFullscreenChange = () => {
				// @ts-expect-error: vendor-prefixed fullscreen properties
				const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
				if (!isFullscreen && $examStore.isStarted && !$examStore.isSubmitted && $examStore.proctoringRules.fullscreenRequired) {
					examStore.addInfraction();
					console.warn('Fullscreen exit detected. Infraction recorded.');
				}
			};

			const handleContextMenu = (e) => {
				if ($examStore.isStarted && !$examStore.isSubmitted && $examStore.proctoringRules.rightClickDisabled) {
					e.preventDefault();
				}
			};

			document.addEventListener('visibilitychange', handleVisibilityChange);
			document.addEventListener('fullscreenchange', handleFullscreenChange);
			document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
			document.addEventListener('mozfullscreenchange', handleFullscreenChange);
			document.addEventListener('MSFullscreenChange', handleFullscreenChange);
			document.addEventListener('contextmenu', handleContextMenu);

			return () => {
				document.removeEventListener('visibilitychange', handleVisibilityChange);
				document.removeEventListener('fullscreenchange', handleFullscreenChange);
				document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
				document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
				document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
				document.removeEventListener('contextmenu', handleContextMenu);
			};
		}
	});
</script>

<svelte:head>
	<title>Resilient Focus CBT</title>
</svelte:head>

<div class="min-h-screen flex flex-col">
	{@render children()}
</div>
