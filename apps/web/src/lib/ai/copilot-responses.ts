export interface CopilotAnswer {
  text: string;
  grounded: boolean;
  citation?: string;
}

const KEYWORD_ANSWERS: { test: RegExp; answer: CopilotAnswer }[] = [
  {
    test: /simpl(y|er|ify)/i,
    answer: {
      grounded: true,
      citation: "Grounded in Slide 14",
      text:
        "Think of treeHeight like measuring how many generations deep a family tree goes. An empty branch (nullptr) contributes nothing, so it returns 0 immediately. A real node adds one generation, plus however many its taller child adds.",
    },
  },
  {
    test: /visual|diagram|show me|picture/i,
    answer: {
      grounded: true,
      citation: "Grounded in Slide 14",
      text: "Here's the tree from Slide 14, with each node labeled by the height treeHeight computes for it.",
    },
  },
  {
    test: /trace|step|call stack/i,
    answer: {
      grounded: true,
      citation: "Grounded in Slide 14",
      text:
        "The moment that matters is line 2 — root == nullptr — which returns 0 before root->left or root->right is ever read. Open the interactive stepper below the quiz to walk it call by call.",
    },
  },
  {
    test: /textbook|3\.2|reading/i,
    answer: {
      grounded: true,
      citation: "Slide 14 · Textbook 3.2",
      text:
        "Textbook 3.2 covers this as the \"empty tree\" base case: by convention, a tree with no nodes has height 0, which is exactly what the nullptr branch returns.",
    },
  },
  {
    test: /nullptr|null|base case|height/i,
    answer: {
      grounded: true,
      citation: "Grounded in Slide 14",
      text:
        "treeHeight(nullptr) returns 0 — that's the base case on line 2. It fires before any dereference of root->left or root->right, which is exactly why it's safe to call on an empty subtree.",
    },
  },
];

const FALLBACK_ANSWER: CopilotAnswer = {
  grounded: false,
  text:
    "I don't see that covered in this lecture's slides or textbook chapter. In general terms: recursive functions typically need a base case that stops the recursion, and a recursive case that makes progress toward it — happy to go deeper if you point me at a specific part of the course.",
};

export function answerFor(question: string): CopilotAnswer {
  const match = KEYWORD_ANSWERS.find((k) => k.test.test(question));
  return match ? match.answer : FALLBACK_ANSWER;
}
