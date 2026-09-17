import type { QuizQuestion } from "./types";

export const MINI_QUIZ: QuizQuestion[] = [
  {
    id: "mini-1",
    prompt: "What's the time complexity of treeHeight on a tree with n nodes?",
    options: [
      { id: "a", text: "O(n)", correct: true },
      { id: "b", text: "O(log n)", correct: false },
      { id: "c", text: "O(n²)", correct: false },
      { id: "d", text: "O(1)", correct: false },
    ],
    correctExplanation: "Every node is visited exactly once, so the work is linear in the number of nodes.",
  },
  {
    id: "mini-2",
    prompt: "What does treeHeight return for a leaf node (no children)?",
    options: [
      { id: "a", text: "0", correct: false },
      { id: "b", text: "1", correct: true },
      { id: "c", text: "2", correct: false },
      { id: "d", text: "Undefined behavior", correct: false },
    ],
    correctExplanation: "Both children are nullptr and return 0, so the leaf returns 1 + max(0, 0) = 1.",
  },
];
