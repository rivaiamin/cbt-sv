import { writable } from 'svelte/store';

// Types
export interface Question {
    id: string;
    text: string;
    options: { id: string; text: string }[];
}

export interface ExamBlock {
    id: string;
    title: string;
    passage: string;
    questions: Question[];
}

export interface ProctoringRules {
    tabSwitchDetection: boolean;
    rightClickDisabled: boolean;
    fullscreenRequired: boolean;
    aiProctoring: boolean;
}

export interface ExamState {
    studentId: string;
    fullName: string;
    currentBlockIndex: number;
    currentQuestionIndex: number;
    answers: Record<string, string>; // questionId -> optionId
    flagged: Set<string>;
    startTime: number | null;
    durationMinutes: number;
    maxQuestions: number;
    proctoringRules: ProctoringRules;
    isStarted: boolean;
    isSubmitted: boolean;
    infractions: number;
}

// Initial State
const initialState: ExamState = {
    studentId: '',
    fullName: '',
    currentBlockIndex: 0,
    currentQuestionIndex: 0,
    answers: {},
    flagged: new Set(),
    startTime: null,
    durationMinutes: 120,
    maxQuestions: 50,
    proctoringRules: {
        tabSwitchDetection: true,
        rightClickDisabled: true,
        fullscreenRequired: false,
        aiProctoring: true
    },
    isStarted: false,
    isSubmitted: false,
    infractions: 0
};

// Mock Data
export const mockExamBlocks: ExamBlock[] = [
    {
        id: 'block-1',
        title: 'Quantum Resilience in Modern Computation',
        passage: `The transition from classical binary logic to quantum superposition presents a fundamental shift in how we approach data integrity. Unlike classical bits, qubits maintain a state of flux until observed, necessitating a new protocol for computer-based testing environments where security and precision are paramount.\n\nEnvironmental decoherence remains the primary obstacle. External noise—even the minor electromagnetic fluctuations of a testing center—can cause quantum states to collapse. To combat this, Resilient Focus utilizes a Tonal Architecture within its UI to minimize cognitive load, ensuring the candidate's neural focus aligns with the machine's processing rhythm.\n\nObservers must note that the validation of quantum-encrypted packets relies on the JWT mechanism previously discussed in technical documentation. This ensures that time-tampering is physically impossible within the decoherence window of the session.`,
        questions: [
            {
                id: 'q1',
                text: 'Based on the passage, what is identified as the primary threat to maintaining quantum states in a testing environment?',
                options: [
                    { id: 'a', text: 'Inherent flaws in binary logic processing' },
                    { id: 'b', text: 'Environmental decoherence and noise' },
                    { id: 'c', text: 'Improper implementation of JWT mechanisms' },
                    { id: 'd', text: 'The candidate\'s neural focus levels' }
                ]
            },
            {
                id: 'q2',
                text: 'How does Resilient Focus attempt to align candidate focus with machine processing?',
                options: [
                    { id: 'a', text: 'By increasing electromagnetic shielding' },
                    { id: 'b', text: 'Through the use of Tonal Architecture in the UI' },
                    { id: 'c', text: 'By enforcing strict JWT validation' },
                    { id: 'd', text: 'By eliminating classical binary logic' }
                ]
            }
        ]
    },
    {
        id: 'block-2',
        title: 'Architecture & Engineering: Offline-First',
        passage: `Offline-first architecture is a design paradigm that ensures an application remains functional without a continuous internet connection. Unlike "offline-capable" systems, which often treat network loss as an error state, offline-first systems prioritize local data storage as the primary source of truth.\n\nKey to this approach is the use of persistent local databases (like IndexedDB or SQLite) and background synchronization mechanisms. When a connection is re-established, the system must reconcile local changes with the server, often using Conflict-Free Replicated Data Types (CRDTs) or operational transformation to resolve data discrepancies.`,
        questions: [
            {
                id: 'q3',
                text: 'Which of the following are characteristics of an offline-first architecture?',
                options: [
                    { id: 'a', text: 'Treating local storage as the primary source of truth' },
                    { id: 'b', text: 'Requirement for continuous high-bandwidth connection' },
                    { id: 'c', text: 'Eliminating the need for background synchronization' },
                    { id: 'd', text: 'Treating network loss as a terminal error state' }
                ]
            }
        ]
    }
];

// Store with persistence
const createExamStore = () => {
    const { subscribe, set, update } = writable<ExamState>(initialState);

    return {
        subscribe,
        init: (studentId: string, fullName: string) => {
            update(s => ({ ...s, studentId, fullName, isStarted: true, startTime: Date.now() }));
        },
        answer: (questionId: string, optionId: string) => {
            update(s => ({
                ...s,
                answers: { ...s.answers, [questionId]: optionId }
            }));
        },
        toggleFlag: (questionId: string) => {
            update(s => {
                const flagged = new Set(s.flagged);
                if (flagged.has(questionId)) flagged.delete(questionId);
                else flagged.add(questionId);
                return { ...s, flagged };
            });
        },
        nextQuestion: () => {
            update(s => {
                const currentBlock = mockExamBlocks[s.currentBlockIndex];
                if (s.currentQuestionIndex < currentBlock.questions.length - 1) {
                    return { ...s, currentQuestionIndex: s.currentQuestionIndex + 1 };
                } else if (s.currentBlockIndex < mockExamBlocks.length - 1) {
                    return { ...s, currentBlockIndex: s.currentBlockIndex + 1, currentQuestionIndex: 0 };
                }
                return s;
            });
        },
        prevQuestion: () => {
            update(s => {
                if (s.currentQuestionIndex > 0) {
                    return { ...s, currentQuestionIndex: s.currentQuestionIndex - 1 };
                } else if (s.currentBlockIndex > 0) {
                    const prevBlock = mockExamBlocks[s.currentBlockIndex - 1];
                    return { ...s, currentBlockIndex: s.currentBlockIndex - 1, currentQuestionIndex: prevBlock.questions.length - 1 };
                }
                return s;
            });
        },
        goToQuestion: (blockIdx: number, qIdx: number) => {
            update(s => ({ ...s, currentBlockIndex: blockIdx, currentQuestionIndex: qIdx }));
        },
        addInfraction: () => {
            update(s => ({ ...s, infractions: s.infractions + 1 }));
        },
        submit: () => {
            update(s => ({ ...s, isSubmitted: true }));
        },
        updateSettings: (settings: Partial<{ durationMinutes: number, maxQuestions: number, proctoringRules: Partial<ProctoringRules> }>) => {
            update(s => ({
                ...s,
                durationMinutes: settings.durationMinutes ?? s.durationMinutes,
                maxQuestions: settings.maxQuestions ?? s.maxQuestions,
                proctoringRules: {
                    ...s.proctoringRules,
                    ...settings.proctoringRules
                }
            }));
        },
        reset: () => set(initialState)
    };
};

export const examStore = createExamStore();
