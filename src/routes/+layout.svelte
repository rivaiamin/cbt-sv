<script>
	import '../index.css';
	import { onMount } from 'svelte';
	import { examStore } from '$lib/examStore';
	import { browser } from '$app/environment';
	import { startBackgroundSync } from '$lib/sync/backgroundSync';

	/** @type {{ children: import('svelte').Snippet }} */
	let { children } = $props();

	onMount(() => {
		if (browser) {
			if ('serviceWorker' in navigator) {
				navigator.serviceWorker.register('/service-worker.js').catch(() => undefined);
			}
			void examStore.initClientDb();
			startBackgroundSync();

			const handleVisibilityChange = () => {
				if (document.hidden && $examStore.isStarted && !$examStore.isSubmitted && $examStore.proctoringRules.tabSwitchDetection) {
					void examStore.addSecurityEvent('tab_switched');
					console.warn('Tab switch detected.');
				}
			};

			const handleFullscreenChange = () => {
				// @ts-expect-error vendor
				const fs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
				if (!fs && $examStore.isStarted && !$examStore.isSubmitted && $examStore.proctoringRules.fullscreenRequired) {
					void examStore.addSecurityEvent('fullscreen_exited');
					console.warn('Fullscreen exit detected.');
				}
			};

			const handleContextMenu = (e) => {
				if ($examStore.isStarted && !$examStore.isSubmitted && $examStore.proctoringRules.rightClickDisabled) {
					e.preventDefault();
				}
			};

			const handleKeyDown = (e) => {
				if (!$examStore.isStarted || $examStore.isSubmitted) return;
				const k = e.key.toLowerCase();
				if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'i', 'u', 's', 'p'].includes(k)) {
					e.preventDefault();
				}
				if (e.altKey && k === 'tab') {
					e.preventDefault();
				}
			};

			document.addEventListener('visibilitychange', handleVisibilityChange);
			document.addEventListener('fullscreenchange', handleFullscreenChange);
			document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
			document.addEventListener('mozfullscreenchange', handleFullscreenChange);
			document.addEventListener('MSFullscreenChange', handleFullscreenChange);
			document.addEventListener('contextmenu', handleContextMenu);
			document.addEventListener('keydown', handleKeyDown, true);

			return () => {
				document.removeEventListener('visibilitychange', handleVisibilityChange);
				document.removeEventListener('fullscreenchange', handleFullscreenChange);
				document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
				document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
				document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
				document.removeEventListener('contextmenu', handleContextMenu);
				document.removeEventListener('keydown', handleKeyDown, true);
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
