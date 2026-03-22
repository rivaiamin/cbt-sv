<script lang="ts">
	import { examStore } from '$lib/examStore';
	import { Shield, Timer, HelpCircle, Save, ArrowLeft, Settings2, Eye, MousePointer2, Maximize2, Cpu } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let duration = $examStore.durationMinutes;
	let maxQuestions = $examStore.maxQuestions;
	let rules = { ...$examStore.proctoringRules };
	let saved = false;

	function handleSave() {
		examStore.updateSettings({
			durationMinutes: duration,
			maxQuestions: maxQuestions,
			proctoringRules: rules
		});
		saved = true;
		setTimeout(() => (saved = false), 3000);
	}

	async function goBack() {
		await goto('/');
	}
</script>

<header class="fixed top-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-surface-container-low border-b border-outline-variant/10">
	<div class="flex items-center gap-3">
		<button onclick={goBack} class="p-2 hover:bg-surface-container rounded-lg transition-colors text-primary">
			<ArrowLeft class="w-5 h-5" />
		</button>
		<div class="flex items-center gap-2">
			<div class="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
				<Settings2 class="text-white w-5 h-5" />
			</div>
			<span class="text-xl font-headline font-bold text-primary tracking-tight">Exam Configuration</span>
		</div>
	</div>
	<div class="flex items-center gap-4">
		{#if saved}
			<span class="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 animate-fade-in">
				Settings Saved Successfully
			</span>
		{/if}
		<button 
			onclick={handleSave}
			class="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
		>
			<Save class="w-4 h-4" />
			Save Changes
		</button>
	</div>
</header>

<main class="w-full max-w-4xl px-6 pt-32 pb-20 mx-auto space-y-12">
	<div class="space-y-2">
		<h1 class="text-3xl font-headline font-extrabold text-primary tracking-tight">Global Parameters</h1>
		<p class="text-on-surface-variant">Configure the core operational metrics for the Resilient Focus CBT engine.</p>
	</div>

	<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
		<!-- Core Metrics -->
		<section class="space-y-6">
			<div class="flex items-center gap-3 border-b border-outline-variant/20 pb-4">
				<Timer class="text-primary w-5 h-5" />
				<h2 class="text-lg font-headline font-bold text-primary">Time & Volume</h2>
			</div>

			<div class="space-y-6">
				<div class="space-y-2">
					<div class="flex justify-between items-center">
						<label for="duration" class="text-xs font-bold text-secondary uppercase tracking-widest">Exam Duration (Minutes)</label>
						<span class="text-sm font-mono font-bold text-primary">{duration}m</span>
					</div>
					<input 
						id="duration"
						type="range" 
						min="15" 
						max="240" 
						step="15"
						bind:value={duration}
						class="w-full h-2 bg-surface-container rounded-lg appearance-none cursor-pointer accent-primary"
					/>
					<div class="flex justify-between text-[10px] font-bold text-on-surface-variant uppercase">
						<span>15m</span>
						<span>120m</span>
						<span>240m</span>
					</div>
				</div>

				<div class="space-y-2">
					<div class="flex justify-between items-center">
						<label for="questions" class="text-xs font-bold text-secondary uppercase tracking-widest">Question Count</label>
						<span class="text-sm font-mono font-bold text-primary">{maxQuestions}</span>
					</div>
					<input 
						id="questions"
						type="number" 
						bind:value={maxQuestions}
						class="w-full h-12 px-4 bg-surface-container-low border border-outline-variant/30 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono font-bold text-primary"
					/>
					<p class="text-[10px] text-on-surface-variant font-medium italic">Note: Slicing logic will be applied if count exceeds available pool.</p>
				</div>
			</div>
		</section>

		<!-- Proctoring Rules -->
		<section class="space-y-6">
			<div class="flex items-center gap-3 border-b border-outline-variant/20 pb-4">
				<Shield class="text-primary w-5 h-5" />
				<h2 class="text-lg font-headline font-bold text-primary">Proctoring Protocols</h2>
			</div>

			<div class="space-y-4">
				<div class="flex items-center justify-between p-4 rounded-xl bg-surface-container-low border border-outline-variant/10 hover:border-primary/30 transition-all group">
					<div class="flex items-center gap-4">
						<div class="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
							<Eye class="w-5 h-5 text-primary" />
						</div>
						<div>
							<p class="text-sm font-bold text-primary">Tab Switch Detection</p>
							<p class="text-[10px] text-on-surface-variant font-medium">Record infractions on visibility loss</p>
						</div>
					</div>
					<label class="relative inline-flex items-center cursor-pointer">
						<input type="checkbox" bind:checked={rules.tabSwitchDetection} class="sr-only peer">
						<div class="w-11 h-6 bg-surface-container rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
					</label>
				</div>

				<div class="flex items-center justify-between p-4 rounded-xl bg-surface-container-low border border-outline-variant/10 hover:border-primary/30 transition-all group">
					<div class="flex items-center gap-4">
						<div class="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
							<MousePointer2 class="w-5 h-5 text-primary" />
						</div>
						<div>
							<p class="text-sm font-bold text-primary">Disable Right-Click</p>
							<p class="text-[10px] text-on-surface-variant font-medium">Prevent context menu access</p>
						</div>
					</div>
					<label class="relative inline-flex items-center cursor-pointer">
						<input type="checkbox" bind:checked={rules.rightClickDisabled} class="sr-only peer">
						<div class="w-11 h-6 bg-surface-container rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
					</label>
				</div>

				<div class="flex items-center justify-between p-4 rounded-xl bg-surface-container-low border border-outline-variant/10 hover:border-primary/30 transition-all group">
					<div class="flex items-center gap-4">
						<div class="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
							<Maximize2 class="w-5 h-5 text-primary" />
						</div>
						<div>
							<p class="text-sm font-bold text-primary">Force Fullscreen</p>
							<p class="text-[10px] text-on-surface-variant font-medium">Require browser to be maximized</p>
						</div>
					</div>
					<label class="relative inline-flex items-center cursor-pointer">
						<input type="checkbox" bind:checked={rules.fullscreenRequired} class="sr-only peer">
						<div class="w-11 h-6 bg-surface-container rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
					</label>
				</div>

				<div class="flex items-center justify-between p-4 rounded-xl bg-surface-container-low border border-outline-variant/10 hover:border-primary/30 transition-all group">
					<div class="flex items-center gap-4">
						<div class="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
							<Cpu class="w-5 h-5 text-primary" />
						</div>
						<div>
							<p class="text-sm font-bold text-primary">AI Behavioral Proctoring</p>
							<p class="text-[10px] text-on-surface-variant font-medium">Neural pattern analysis active</p>
						</div>
					</div>
					<label class="relative inline-flex items-center cursor-pointer">
						<input type="checkbox" bind:checked={rules.aiProctoring} class="sr-only peer">
						<div class="w-11 h-6 bg-surface-container rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
					</label>
				</div>
			</div>
		</section>
	</div>

	<div class="p-8 rounded-2xl bg-primary/5 border border-primary/10 flex items-start gap-6">
		<div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
			<HelpCircle class="w-6 h-6 text-primary" />
		</div>
		<div class="space-y-2">
			<h3 class="font-headline font-bold text-primary">Security Note</h3>
			<p class="text-sm text-on-surface-variant leading-relaxed">
				Changes to proctoring protocols will only take effect for NEW exam sessions. Active sessions will continue with the parameters set at initialization to maintain forensic integrity.
			</p>
		</div>
	</div>
</main>

<style>
	@keyframes fade-in {
		from { opacity: 0; transform: translateY(-10px); }
		to { opacity: 1; transform: translateY(0); }
	}
	.animate-fade-in {
		animation: fade-in 0.3s ease-out forwards;
	}
</style>
