import { getExamDatabase } from './client';
import type { ExamBlock } from '$lib/types/quiz';
import type { QuizQuestion } from '$lib/types/quiz';

function mapQuestions(qs: QuizQuestion[]): ExamBlock['questions'] {
	return qs.map((q) => ({
		id: q.question_id,
		text: q.question_text,
		options: q.options.map((o) => ({ id: o.option_id, text: o.text }))
	}));
}

export async function rebuildOrderedBlocksFromLayout(
	quizId: string,
	sessionId: string
): Promise<ExamBlock[] | null> {
	const db = await getExamDatabase();
	const layout = await db.session_layout.findOne(sessionId).exec();
	if (!layout) return null;

	const blockOrder: string[] = JSON.parse(layout.block_order_json);
	const questionOrders: Record<string, string[]> = JSON.parse(layout.question_orders_json);

	const blocks = await db.question_block.find({ selector: { quiz_id: quizId } }).exec();
	const blockMap = new Map(blocks.map((d) => [d.block_id, d]));

	return blockOrder.map((bid) => {
		const row = blockMap.get(bid);
		if (!row) throw new Error(`Missing block ${bid}`);
		const raw: QuizQuestion[] = JSON.parse(row.questions_json);
		const qById = new Map(raw.map((q) => [q.question_id, q]));
		const order = questionOrders[bid] ?? raw.map((q) => q.question_id);
		const orderedQs = order.map((id) => qById.get(id)).filter((q): q is QuizQuestion => q != null);
		return {
			id: bid,
			title: 'Reading block',
			passage: row.shared_content,
			questions: mapQuestions(orderedQs)
		};
	});
}

export async function loadAnswersForSession(sessionId: string): Promise<{
	answers: Record<string, string>;
	flagged: Set<string>;
}> {
	const db = await getExamDatabase();
	const recs = await db.answer_record.find({ selector: { session_id: sessionId } }).exec();
	const answers: Record<string, string> = {};
	const flagged = new Set<string>();
	for (const r of recs) {
		const d = r.toMutableJSON();
		if (d.selected_option_id) {
			answers[d.question_id] = d.selected_option_id;
		}
		if (d.is_doubtful) {
			flagged.add(d.question_id);
		}
	}
	return { answers, flagged };
}
