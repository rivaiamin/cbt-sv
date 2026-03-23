import { getExamDatabase } from './client';
import type { ExamBlock, QuizBundle } from '$lib/types/quiz';
import { shuffleArray } from '$lib/quiz/shuffle';

function mapToExamBlock(blockId: string, shared: string, questionsOrdered: QuizBundle['blocks'][0]['questions']): ExamBlock {
	return {
		id: blockId,
		title: `Reading block`,
		passage: shared,
		questions: questionsOrdered.map((q) => ({
			id: q.question_id,
			text: q.question_text,
			options: q.options.map((o) => ({ id: o.option_id, text: o.text }))
		}))
	};
}

export async function importQuizBundleIntoRxDB(bundle: QuizBundle): Promise<void> {
	const db = await getExamDatabase();
	const meta = bundle.quiz_metadata;

	await db.quiz_metadata.upsert({
		quiz_id: meta.quiz_id,
		title: meta.title,
		start_time: meta.start_time,
		duration_minutes: meta.duration_minutes,
		passcode_seed: meta.passcode_seed,
		passcode_interval: meta.passcode_interval,
		operator_started_manually: meta.operator_started_manually ?? false
	});

	for (const b of bundle.blocks) {
		await db.question_block.upsert({
			block_id: b.block_id,
			quiz_id: meta.quiz_id,
			shared_content: b.shared_content,
			questions_json: JSON.stringify(b.questions),
			randomize_inner_questions: b.randomize_inner_questions
		});
	}
}

export interface SessionLayoutResult {
	sessionId: string;
	orderedBlocks: ExamBlock[];
	blockOrder: string[];
	questionOrders: Record<string, string[]>;
}

export function computeShuffledLayout(bundle: QuizBundle, sessionId: string): SessionLayoutResult {
	const blockOrder = shuffleArray(bundle.blocks.map((b) => b.block_id));
	const questionOrders: Record<string, string[]> = {};

	for (const b of bundle.blocks) {
		let ids = b.questions.map((q) => q.question_id);
		if (b.randomize_inner_questions) {
			ids = shuffleArray(ids);
		}
		questionOrders[b.block_id] = ids;
	}

	const blockMap = new Map(bundle.blocks.map((b) => [b.block_id, b]));
	const orderedBlocks: ExamBlock[] = blockOrder.map((bid) => {
		const b = blockMap.get(bid)!;
		const order = questionOrders[bid];
		const qById = new Map(b.questions.map((q) => [q.question_id, q]));
		const questionsOrdered = order.map((id) => qById.get(id)!);
		return mapToExamBlock(bid, b.shared_content, questionsOrdered);
	});

	return { sessionId, orderedBlocks, blockOrder, questionOrders };
}

export async function persistSessionLayout(
	participantId: string,
	quizId: string,
	layout: SessionLayoutResult
): Promise<void> {
	const db = await getExamDatabase();
	await db.session_layout.upsert({
		id: layout.sessionId,
		participant_id: participantId,
		quiz_id: quizId,
		block_order_json: JSON.stringify(layout.blockOrder),
		question_orders_json: JSON.stringify(layout.questionOrders)
	});
}
