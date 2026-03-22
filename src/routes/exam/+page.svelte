<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { examStore, mockExamBlocks } from '$lib/examStore';
	import { goto } from '$app/navigation';
	import { Timer, User, BookOpen, Flag, ChevronLeft, ChevronRight, TriangleAlert, HelpCircle, LogOut } from 'lucide-svelte';

	let timeRemaining = '01:42:58';
	let timerInterval: ReturnType<typeof setInterval> | undefined;

	$: currentBlock = mockExamBlocks[$examStore.currentBlockIndex];
	$: currentQuestion = currentBlock.questions[$examStore.currentQuestionIndex];
	$: isFlagged = $examStore.flagged.has(currentQuestion.id);
	$: selectedOption = $examStore.answers[currentQuestion.id];

	onMount(() => {
		if (!$examStore.isStarted) {
			goto('/');
		}
		
		// Simple countdown mock
		let seconds = 120 * 60;
		timerInterval = setInterval(() => {
			seconds--;
			const h = Math.floor(seconds / 3600);
			const m = Math.floor((seconds % 3600) / 60);
			const s = seconds % 60;
			timeRemaining = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
		}, 1000);
	});

	onDestroy(() => {
		if (timerInterval) clearInterval(timerInterval);
	});

	function handleOptionSelect(optionId: string) {
		examStore.answer(currentQuestion.id, optionId);
	}

	function handleFinalSubmit() {
		if (confirm('Are you sure you want to submit your exam? This action cannot be undone.')) {
			examStore.submit();
			goto('/review');
		}
	}
</script>

<header class="fixed top-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-white border-b border-outline-variant/10">
	<div class="flex items-center gap-4">
		<span class="text-xl font-bold text-primary font-headline tracking-tight">Resilient Focus CBT</span>
		<div class="h-6 w-px bg-outline-variant mx-2"></div>
		<div class="flex flex-col">
			<span class="text-[10px] font-bold uppercase tracking-widest text-secondary">Candidate ID</span>
			<span class="text-sm font-bold font-headline text-primary">ST-8829-X-2024</span>
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
				<p class="text-sm font-bold font-headline leading-tight">{$examStore.fullName || 'Marcus Holloway'}</p>
				<p class="text-[11px] text-secondary font-medium">Advanced Systems Architecture</p>
			</div>
			<div class="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center border-2 border-white">
				<User class="text-primary w-5 h-5" />
			</div>
		</div>
	</div>
</header>

<main class="pt-16 h-screen flex overflow-hidden">
	<!-- Left Side: Reading Passage -->
	<div class="w-1/2 overflow-y-auto p-10 bg-surface-container-low border-r border-outline-variant/10">
		<div class="max-w-2xl mx-auto">
			<div class="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-6">
				<BookOpen class="w-4 h-4 mr-2" />
				READING PASSAGE: BLOCK {$examStore.currentBlockIndex + 1}
			</div>
			<h1 class="text-3xl font-extrabold font-headline text-primary mb-6 leading-tight">{currentBlock.title}</h1>
			<div class="space-y-6 text-on-surface/80 leading-relaxed text-lg whitespace-pre-line">
				{currentBlock.passage}
			</div>
		</div>
	</div>

	<!-- Right Side: Question & Options -->
	<div class="w-1/2 overflow-y-auto p-10 bg-white">
		<div class="max-w-xl mx-auto">
			<div class="flex justify-between items-center mb-10">
				<span class="text-sm font-bold text-secondary tracking-widest uppercase">Question {$examStore.currentQuestionIndex + 1} of {currentBlock.questions.length}</span>
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

	<!-- Sidebar: Question Grid -->
	<aside class="w-80 h-full bg-surface-container-low flex flex-col border-l border-outline-variant/10">
		<div class="p-6 border-b border-outline-variant/10">
			<h3 class="text-sm font-extrabold font-headline text-primary uppercase tracking-widest mb-4">Question Grid</h3>
			<div class="grid grid-cols-5 gap-2">
				{#each mockExamBlocks as block, bIdx (block.id)}
					{#each block.questions as q, qIdx (q.id)}
						{@const isAns = $examStore.answers[q.id]}
						{@const isFlg = $examStore.flagged.has(q.id)}
						{@const isAct = $examStore.currentBlockIndex === bIdx && $examStore.currentQuestionIndex === qIdx}
						<button 
							class="aspect-square flex items-center justify-center rounded-lg text-sm font-bold transition-all
							{isAct ? 'ring-4 ring-primary bg-white text-primary' : 
							 isAns ? 'bg-primary text-white' : 
							 isFlg ? 'bg-tertiary-container text-white' : 
							 'bg-surface-container-highest text-primary'}"
							onclick={() => examStore.goToQuestion(bIdx, qIdx)}
						>
							{(bIdx * 10 + qIdx + 1).toString().padStart(2, '0')}
						</button>
					{/each}
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

			{#if $examStore.infractions > 0}
				<div class="p-4 rounded-xl bg-error/5 border border-error/10">
					<div class="flex items-center gap-2 text-error mb-2">
						<TriangleAlert class="w-4 h-4" />
						<span class="text-xs font-bold uppercase tracking-tight">Security Alert</span>
					</div>
					<p class="text-[11px] text-on-surface/70 leading-relaxed font-medium">
						Session is monitored. {$examStore.infractions} tab switch(es) detected. Multiple infractions will trigger an auto-submit protocol.
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

<button class="fixed bottom-6 right-[340px] w-12 h-12 rounded-full bg-white shadow-xl flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all border border-outline-variant/20">
	<HelpCircle class="w-6 h-6" />
</button>
