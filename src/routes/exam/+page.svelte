<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { get } from 'svelte/store';
	import { examStore, getFlatQuestionRefs } from '$lib/examStore';
	import { goto } from '$app/navigation';
	import { Timer, User, BookOpen, Flag, ChevronLeft, ChevronRight, TriangleAlert, HelpCircle, LogOut, Maximize2 } from 'lucide-svelte';
	import { browser } from '$app/environment';
	import ExamTimerWorker from '$lib/workers/examTimer.worker.ts?worker';

	let timeRemaining = '00:00:00';
	let timerWorker: Worker | null = null;
	let hbTimer: ReturnType<typeof setInterval> | null = null;
	let isFullscreen = true;

	$: flat = getFlatQuestionRefs($examStore.orderedBlocks);
	$: ref = flat[$examStore.currentGlobalIndex];
	$: currentBlock = ref ? $examStore.orderedBlocks[ref.blockIdx] : null;
	$: currentQuestion = ref && currentBlock ? currentBlock.questions[ref.qIdx] : null;
	$: isFlagged = currentQuestion ? $examStore.flagged.has(currentQuestion.id) : false;
	$: selectedOption = currentQuestion ? $examStore.answers[currentQuestion.id] : undefined;
	$: totalQuestions = flat.length;

	function checkFullscreen() {
		if (!browser) return true;
		// @ts-expect-error vendor
		return !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
	}

	async function enterFullscreen() {
		const elem = document.documentElement;
		try {
			if (elem.requestFullscreen) {
				await elem.requestFullscreen();
			// @ts-expect-error vendor
			} else if (elem.webkitRequestFullscreen) {
				// @ts-expect-error vendor
				await elem.webkitRequestFullscreen();
			// @ts-expect-error vendor
			} else if (elem.msRequestFullscreen) {
				// @ts-expect-error vendor
				await elem.msRequestFullscreen();
			}
		} catch (err) {
			console.error('Error attempting to enable full-screen mode:', err);
		}
	}

	function setupTimerWorker() {
		if (!browser) return;
		if (timerWorker) {
			timerWorker.terminate();
			timerWorker = null;
		}
		const s = get(examStore);
		if (!s.endsAtMs) return;
		timerWorker = new ExamTimerWorker();
		timerWorker.onmessage = (ev: MessageEvent<{ remainingFormatted: string }>) => {
			timeRemaining = ev.data.remainingFormatted;
		};
		timerWorker.postMessage({
			type: 'init',
			endsAtMs: s.endsAtMs,
			serverSkewMs: s.serverSkewMs
		});
	}

	onMount(() => {
		if (!browser) return;

		let unsub: () => void = () => {};

		function wireExamUi() {
			setupTimerWorker();
			unsub = examStore.subscribe((s) => {
				if (s.endsAtMs && timerWorker) {
					timerWorker.postMessage({
						type: 'init',
						endsAtMs: s.endsAtMs,
						serverSkewMs: s.serverSkewMs
					});
				}
			});

			hbTimer = setInterval(async () => {
				const s = get(examStore);
				if (!s.jwtToken) return;
				try {
					const r = await fetch('/api/session/heartbeat', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ token: s.jwtToken })
					});
					if (r.ok) {
						const j = await r.json();
						examStore.setJwtTiming(j.token, j.ends_at, j.server_now);
					}
				} catch {
					/* offline */
				}
			}, 60_000);
		}

		if (!get(examStore).isStarted) {
			void examStore.tryRestoreSession().then((ok) => {
				if (!ok) {
					void goto('/');
					return;
				}
				wireExamUi();
			});
		} else {
			wireExamUi();
		}

		const handleFullscreenChange = () => {
			isFullscreen = checkFullscreen();
		};

		document.addEventListener('fullscreenchange', handleFullscreenChange);
		document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
		document.addEventListener('mozfullscreenchange', handleFullscreenChange);
		document.addEventListener('MSFullscreenChange', handleFullscreenChange);

		isFullscreen = checkFullscreen();

		return () => {
			unsub();
			if (timerWorker) {
				timerWorker.terminate();
				timerWorker = null;
			}
			if (hbTimer) clearInterval(hbTimer);
			document.removeEventListener('fullscreenchange', handleFullscreenChange);
			document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
			document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
			document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
		};
	});

	onDestroy(() => {
		if (timerWorker) timerWorker.terminate();
		if (hbTimer) clearInterval(hbTimer);
	});

	function handleOptionSelect(optionId: string) {
		if (!currentQuestion) return;
		examStore.answer(currentQuestion.id, optionId);
	}

	function handleFinalSubmit() {
		if (confirm('Are you sure you want to submit your exam? This action cannot be undone.')) {
			examStore.submit();
			goto('/review');
		}
	}
</script>

{#if currentQuestion && currentBlock}
<header class="fixed top-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-white border-b border-outline-variant/10">
	<div class="flex items-center gap-4">
		<span class="text-xl font-bold text-primary font-headline tracking-tight">Resilient Focus CBT</span>
		<div class="h-6 w-px bg-outline-variant mx-2"></div>
		<div class="flex flex-col">
			<span class="text-[10px] font-bold uppercase tracking-widest text-secondary">Candidate ID</span>
			<span class="text-sm font-bold font-headline text-primary">{$examStore.studentId}</span>
		</div>
	</div>

	<div class="flex items-center gap-6">
		<div class="flex items-center gap-3 px-4 py-2 bg-surface-container rounded-xl">
			<Timer class="text-primary w-5 h-5" />
			<div class="flex flex-col items-end leading-none">
				<span class="text-[10px] font-bold uppercase tracking-tighter text-secondary">Time Remaining</span>
				<span class="text-lg font-extrabold font-headline text-primary tabular-nums">{timeRemaining}</span>
			</div>
		</div>
		<div class="flex items-center gap-2">
			<div class="text-right">
				<p class="text-sm font-bold font-headline leading-tight">{$examStore.fullName}</p>
				<p class="text-[11px] text-secondary font-medium">{$examStore.quizId}</p>
			</div>
			<div class="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center border-2 border-white">
				<User class="text-primary w-5 h-5" />
			</div>
		</div>
	</div>
</header>

<main class="pt-16 h-screen flex overflow-hidden">
	<div class="w-1/2 overflow-y-auto p-10 bg-surface-container-low border-r border-outline-variant/10">
		<div class="max-w-2xl mx-auto">
			<div class="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-6">
				<BookOpen class="w-4 h-4 mr-2" />
				READING PASSAGE: BLOCK {ref.blockIdx + 1}
			</div>
			<h1 class="text-3xl font-extrabold font-headline text-primary mb-6 leading-tight">Block {ref.blockIdx + 1}</h1>
			<div class="space-y-6 text-on-surface/80 leading-relaxed text-lg whitespace-pre-line">
				{currentBlock.passage}
			</div>
		</div>
	</div>

	<div class="w-1/2 overflow-y-auto p-10 bg-white">
		<div class="max-w-xl mx-auto">
			<div class="flex justify-between items-center mb-10">
				<span class="text-sm font-bold text-secondary tracking-widest uppercase">Question {$examStore.currentGlobalIndex + 1} of {totalQuestions}</span>
				<button 
					class="flex items-center gap-2 font-bold text-sm transition-all {isFlagged ? 'text-tertiary' : 'text-primary hover:underline'}"
					onclick={() => examStore.toggleFlag(currentQuestion.id)}
				>
					<Flag class="w-4 h-4 {isFlagged ? 'fill-current' : ''}" />
					{isFlagged ? 'Flagged' : 'Mark as Doubtful'}
				</button>
			</div>

			<h2 class="text-2xl font-bold font-headline text-primary mb-8 leading-snug">
				{currentQuestion.text}
			</h2>

			<div class="space-y-4">
				{#each currentQuestion.options as option (option.id)}
					<label 
						class="group relative flex items-center p-5 rounded-xl border-2 transition-all cursor-pointer 
						{selectedOption === option.id ? 'border-primary bg-surface-container-low' : 'border-transparent bg-surface-container-low hover:bg-surface-container'}"
					>
						<input 
							type="radio" 
							name="exam_option" 
							class="hidden" 
							checked={selectedOption === option.id}
							onchange={() => handleOptionSelect(option.id)}
						/>
						<div class="w-8 h-8 rounded-lg flex items-center justify-center font-bold transition-colors mr-4 
							{selectedOption === option.id ? 'bg-primary text-white' : 'bg-surface-container-highest text-primary group-hover:bg-primary group-hover:text-white'}">
							{option.id.toUpperCase()}
						</div>
						<span class="text-on-surface font-medium text-lg">{option.text}</span>
					</label>
				{/each}
			</div>

			<div class="mt-12 pt-8 border-t border-outline-variant/20 flex gap-4">
				<button 
					class="flex-1 py-4 px-6 rounded-lg bg-surface-container-highest text-primary font-bold flex items-center justify-center gap-2 hover:bg-surface-container transition-all"
					onclick={() => examStore.prevQuestion()}
				>
					<ChevronLeft class="w-5 h-5" />
					Previous
				</button>
				<button 
					class="flex-[2] py-4 px-6 rounded-lg bg-gradient-to-br from-primary to-primary-container text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
					onclick={() => examStore.nextQuestion()}
				>
					Save and Next
					<ChevronRight class="w-5 h-5" />
				</button>
			</div>
		</div>
	</div>

	<aside class="w-80 h-full bg-surface-container-low flex flex-col border-l border-outline-variant/10">
		<div class="p-6 border-b border-outline-variant/10">
			<h3 class="text-sm font-extrabold font-headline text-primary uppercase tracking-widest mb-4">Question Grid</h3>
			<div class="grid grid-cols-5 gap-2">
				{#each flat as r, globalIdx (r.questionId)}
					{@const isAns = $examStore.answers[r.questionId]}
					{@const isFlg = $examStore.flagged.has(r.questionId)}
					{@const isAct = $examStore.currentGlobalIndex === globalIdx}
					<button 
						class="aspect-square flex items-center justify-center rounded-lg text-sm font-bold transition-all
						{isAct ? 'ring-4 ring-primary bg-white text-primary' : 
						 isAns ? 'bg-primary text-white' : 
						 isFlg ? 'bg-tertiary-container text-white' : 
						 'bg-surface-container-highest text-primary'}"
						onclick={() => examStore.goToQuestion(globalIdx)}
					>
						{(globalIdx + 1).toString().padStart(2, '0')}
					</button>
				{/each}
			</div>
		</div>

		<div class="flex-1 p-6 space-y-6 overflow-y-auto">
			<div>
				<h4 class="text-[10px] font-bold uppercase tracking-widest text-secondary mb-3">Legend</h4>
				<div class="space-y-2">
					<div class="flex items-center gap-3">
						<div class="w-3 h-3 rounded-full bg-primary"></div>
						<span class="text-xs font-medium text-secondary">Answered</span>
					</div>
					<div class="flex items-center gap-3">
						<div class="w-3 h-3 rounded-full bg-tertiary-container"></div>
						<span class="text-xs font-medium text-secondary">Doubtful</span>
					</div>
					<div class="flex items-center gap-3">
						<div class="w-3 h-3 rounded-full bg-surface-container-highest"></div>
						<span class="text-xs font-medium text-secondary">Unanswered</span>
					</div>
				</div>
			</div>

			{#if $examStore.securityEventCount > 0}
				<div class="p-4 rounded-xl bg-error/5 border border-error/10">
					<div class="flex items-center gap-2 text-error mb-2">
						<TriangleAlert class="w-4 h-4" />
						<span class="text-xs font-bold uppercase tracking-tight">Security Alert</span>
					</div>
					<p class="text-[11px] text-on-surface/70 leading-relaxed font-medium">
						{$examStore.securityEventCount} security event(s) recorded and synced.
					</p>
				</div>
			{/if}
		</div>

		<div class="p-6">
			<button 
				class="w-full py-4 bg-error text-white font-bold font-headline rounded-xl hover:bg-error/90 transition-colors shadow-lg shadow-error/20 flex items-center justify-center gap-2"
				onclick={handleFinalSubmit}
			>
				<LogOut class="w-5 h-5" />
				Final Submit
			</button>
		</div>
	</aside>
</main>

{#if !isFullscreen && $examStore.proctoringRules.fullscreenRequired}
	<div class="fixed inset-0 z-[100] bg-primary/95 backdrop-blur-md flex items-center justify-center p-6">
		<div class="max-w-md w-full bg-white rounded-3xl p-10 shadow-2xl text-center space-y-8 animate-in fade-in zoom-in duration-300">
			<div class="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
				<Maximize2 class="w-10 h-10 text-primary animate-pulse" />
			</div>
			<div class="space-y-3">
				<h2 class="text-2xl font-headline font-extrabold text-primary tracking-tight">Fullscreen Required</h2>
				<p class="text-on-surface-variant leading-relaxed">
					Fullscreen mode must stay active. A security event was recorded.
				</p>
			</div>
			<button 
				onclick={enterFullscreen}
				class="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
			>
				<Maximize2 class="w-5 h-5" />
				Re-enter Fullscreen
			</button>
		</div>
	</div>
{/if}

<button type="button" class="fixed bottom-6 right-[340px] w-12 h-12 rounded-full bg-white shadow-xl flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all border border-outline-variant/20" aria-label="Help">
	<HelpCircle class="w-6 h-6" />
</button>
{:else}
	<div class="min-h-screen flex items-center justify-center p-8">
		<p class="text-secondary">Loading exam…</p>
	</div>
{/if}
