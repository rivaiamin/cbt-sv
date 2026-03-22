<script lang="ts">
	import { examStore, mockExamBlocks } from '$lib/examStore';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { BarChart, LayoutGrid, Flag, TriangleAlert, Lock, User, Timer, ShieldCheck } from 'lucide-svelte';

	$: totalQuestions = mockExamBlocks.reduce((acc, b) => acc + b.questions.length, 0);
	$: answeredCount = Object.keys($examStore.answers).length;
	$: flaggedCount = $examStore.flagged.size;
	$: if (totalQuestions && answeredCount && flaggedCount) { /* dummy to satisfy svelte/no-immutable-reactive-statements */ }

	onMount(async () => {
		if (!$examStore.isStarted) await goto('/');
	});

	async function handleFinalize() {
		alert('Exam submitted successfully. You will be redirected to the home page.');
		examStore.reset();
		await goto('/');
	}
</script>

<aside class="fixed left-0 top-0 h-full w-64 bg-surface-container-low flex flex-col p-4 z-50 border-r border-outline-variant/10">
	<div class="mb-8 px-2">
		<h2 class="text-lg font-bold text-primary">CBT Environment</h2>
		<p class="text-xs font-medium text-secondary">Exam ID: 4920-X</p>
	</div>
	<nav class="flex-1 space-y-1">
		<button class="w-full flex items-center gap-3 px-4 py-3 bg-surface-container-highest text-primary font-semibold rounded-lg transition-all">
			<BarChart class="w-5 h-5" />
			<span class="font-headline text-sm">Exam Summary</span>
		</button>
		<button class="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-surface-container transition-all rounded-lg">
			<LayoutGrid class="w-5 h-5" />
			<span class="font-headline text-sm">Question Grid</span>
		</button>
		<button class="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-surface-container transition-all rounded-lg">
			<Flag class="w-5 h-5" />
			<span class="font-headline text-sm">Flagged Items</span>
		</button>
	</nav>
	<div class="mt-auto pt-6 border-t border-outline-variant/20">
		<div class="flex items-center gap-3 px-2 mb-6">
			<div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
				{$examStore.fullName?.charAt(0) || 'M'}
			</div>
			<div>
				<p class="text-sm font-bold text-on-surface">{$examStore.fullName || 'Marcus Holloway'}</p>
				<p class="text-xs text-secondary">Candidate ID: 8821</p>
			</div>
		</div>
		<button 
			class="w-full py-3 px-4 bg-gradient-to-br from-primary to-primary-container text-white font-bold rounded-lg shadow-sm hover:opacity-90 active:scale-95 transition-all"
			onclick={handleFinalize}
		>
			Finalize & Submit
		</button>
	</div>
</aside>

<div class="flex-1 ml-64 flex flex-col">
	<header class="sticky top-0 w-full bg-white px-8 py-4 flex justify-between items-center z-40 border-b border-outline-variant/10">
		<div class="flex items-center gap-4">
			<h1 class="text-xl font-bold tracking-tight text-primary">Resilient Focus</h1>
			<div class="h-6 w-px bg-outline-variant"></div>
			<div class="flex items-center gap-2 bg-surface-container-high px-3 py-1 rounded-full">
				<Timer class="text-primary w-4 h-4" />
				<span class="text-sm font-bold text-primary tabular-nums">01:42:58</span>
			</div>
		</div>
		<div class="flex items-center gap-4">
			<div class="text-right hidden md:block">
				<p class="text-xs font-bold text-secondary uppercase tracking-widest">Session Status</p>
				<p class="text-sm font-bold text-primary">Review Mode Active</p>
			</div>
			<User class="text-on-surface-variant w-6 h-6" />
		</div>
	</header>

	<main class="p-8 max-w-6xl mx-auto w-full space-y-8 pb-24">
		<section class="grid grid-cols-1 md:grid-cols-4 gap-6">
			<div class="md:col-span-4 bg-white p-8 rounded-xl flex flex-col md:flex-row justify-between items-center gap-8 border border-outline-variant/10 shadow-sm">
				<div class="space-y-2">
					<h2 class="text-3xl font-extrabold text-primary tracking-tight">Final Examination Review</h2>
					<p class="text-secondary font-medium">Please review your responses carefully. Once submitted, you cannot return to the exam.</p>
				</div>
				<div class="flex gap-4">
					<div class="text-center px-6 py-4 bg-surface-container rounded-xl border border-outline-variant/20">
						<p class="text-xs font-bold text-secondary uppercase mb-1">Total</p>
						<p class="text-2xl font-black text-on-surface">{totalQuestions}</p>
					</div>
					<div class="text-center px-6 py-4 bg-primary text-white rounded-xl">
						<p class="text-xs font-bold text-white/70 uppercase mb-1">Answered</p>
						<p class="text-2xl font-black">{answeredCount}</p>
					</div>
				</div>
			</div>
		</section>

		<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
			<div class="lg:col-span-2 space-y-6">
				<div class="bg-surface-container-low p-6 rounded-xl space-y-6">
					<div class="flex justify-between items-center">
						<h3 class="text-lg font-bold text-primary flex items-center gap-2">
							<LayoutGrid class="w-5 h-5" />
							Question Navigation Grid
						</h3>
						<div class="flex gap-4">
							<div class="flex items-center gap-2 text-xs font-bold text-secondary">
								<div class="w-3 h-3 rounded-sm bg-primary"></div> Answered
							</div>
							<div class="flex items-center gap-2 text-xs font-bold text-secondary">
								<div class="w-3 h-3 rounded-sm bg-tertiary-container"></div> Flagged
							</div>
							<div class="flex items-center gap-2 text-xs font-bold text-secondary">
								<div class="w-3 h-3 rounded-sm border border-outline-variant bg-white"></div> Unanswered
							</div>
						</div>
					</div>

					<div class="grid grid-cols-5 sm:grid-cols-10 gap-2">
						{#each mockExamBlocks as block, bIdx (block.id)}
							{#each block.questions as q, qIdx (q.id)}
								{@const isAns = $examStore.answers[q.id]}
								{@const isFlg = $examStore.flagged.has(q.id)}
								<button 
									class="aspect-square flex items-center justify-center text-sm font-bold rounded-md transition-all
									{isAns ? 'bg-primary text-white' : 
									 isFlg ? 'bg-tertiary-container text-white' : 
									 'bg-white border border-outline-variant/30 text-secondary'}"
									onclick={() => examStore.goToQuestion(bIdx, qIdx)}
								>
									{bIdx * 10 + qIdx + 1}
								</button>
							{/each}
						{/each}
					</div>
				</div>

				<div class="bg-error-container/30 p-8 rounded-xl border border-error/10 flex items-start gap-6">
					<div class="bg-error-container p-3 rounded-full text-error">
						<TriangleAlert class="w-6 h-6" />
					</div>
					<div>
						<h3 class="text-lg font-bold text-on-error-container">Final Submission Warning</h3>
						<p class="text-on-error-container/80 text-sm mt-1 leading-relaxed">
							You are about to submit your final examination. By clicking the button below, you certify that all answers are your own. You will <strong>not</strong> be able to change your answers or return to this test after submission. 
						</p>
						<button 
							class="mt-6 px-8 py-4 bg-gradient-to-r from-primary to-primary-container text-white font-bold rounded-lg shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center gap-3"
							onclick={handleFinalize}
						>
							<Lock class="w-5 h-5" />
							Finalize & Submit Exam
						</button>
					</div>
				</div>
			</div>

			<div class="space-y-8">
				<div class="bg-surface-container-high p-6 rounded-xl">
					<h3 class="text-sm font-bold text-secondary uppercase tracking-widest mb-4">Flagged for Review ({flaggedCount})</h3>
					<div class="space-y-3">
						{#each Array.from($examStore.flagged) as qId (qId)}
							<div class="p-4 bg-white rounded-lg border-l-4 border-tertiary-container hover:bg-surface-container-low transition-colors cursor-pointer group">
								<div class="flex justify-between items-start mb-1">
									<span class="text-xs font-bold text-primary">Question {qId.replace('q', '')}</span>
									<Flag class="w-3 h-3 text-tertiary fill-current" />
								</div>
								<p class="text-sm text-on-surface line-clamp-2 leading-snug group-hover:text-primary transition-colors">
									Review required for this item before final submission...
								</p>
							</div>
						{/each}
						{#if flaggedCount === 0}
							<p class="text-xs text-secondary italic">No items flagged for review.</p>
						{/if}
					</div>
				</div>

				<div class="bg-primary text-white p-6 rounded-xl relative overflow-hidden">
					<div class="relative z-10">
						<h3 class="text-sm font-bold opacity-70 uppercase tracking-widest mb-2">Integrity Check</h3>
						<div class="flex items-center gap-2 mb-4">
							<ShieldCheck class="w-5 h-5 text-emerald-400" />
							<span class="text-xs font-semibold">Environment Secure</span>
						</div>
						<p class="text-sm opacity-80 leading-relaxed">
							No network interruptions or biometric anomalies detected during your session.
						</p>
					</div>
					<Lock class="absolute -right-4 -bottom-4 w-24 h-24 opacity-10" />
				</div>
			</div>
		</div>
	</main>
</div>
