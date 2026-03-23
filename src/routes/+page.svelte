<script lang="ts">
	import { Shield, ArrowRight } from 'lucide-svelte';
</script>

<svelte:head>
	<title>Resilient Focus CBT</title>
</svelte:head>

<div class="min-h-screen flex flex-col items-center justify-center px-6 py-20 bg-surface-container-low">
	<div class="w-full max-w-lg text-center space-y-8">
		<div class="flex justify-center">
			<div class="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
				<Shield class="text-white w-8 h-8" />
			</div>
		</div>
		<div class="space-y-2">
			<h1 class="text-3xl font-headline font-extrabold text-primary tracking-tight">Resilient Focus CBT</h1>
			<p class="text-on-surface-variant text-sm leading-relaxed">
				Sign in to take an exam (participant), monitor a session (operator), or manage content (admin).
			</p>
		</div>
		<div class="flex flex-col sm:flex-row gap-3 justify-center">
			<a
				href="/login"
				class="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-primary text-white font-headline font-bold shadow-lg shadow-primary/20 hover:opacity-95 transition-opacity"
			>
				Sign in
				<ArrowRight class="w-5 h-5" />
			</a>
		</div>
	</div>
</div>
