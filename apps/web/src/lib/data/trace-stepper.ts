export interface TraceStep {
  narration: string;
  highlightLine: number; // 1-indexed into TREE_HEIGHT_CODE
  callStack: string[];
  variables: Record<string, string>;
}

export const TREE_HEIGHT_CODE = [
  "int treeHeight(Node* root) {",
  "  if (root == nullptr) return 0;",
  "  int left  = treeHeight(root->left);",
  "  int right = treeHeight(root->right);",
  "  return 1 + std::max(left, right);",
  "}",
];

/**
 * Walks the exact misconception the quiz question tests: what treeHeight(nullptr)
 * returns. Tree shape: A has left child B, B is a leaf (frontend plan Screen 5 / mockup
 * prompt 3's Trace Stepper for the recursive call stack).
 */
export const TREE_HEIGHT_TRACE: TraceStep[] = [
  {
    narration: "Call treeHeight(A) on the full tree.",
    highlightLine: 1,
    callStack: ["treeHeight(A)"],
    variables: { root: "A" },
  },
  {
    narration: "A isn't null, so line 3 recurses into the left subtree: treeHeight(A->left).",
    highlightLine: 3,
    callStack: ["treeHeight(A)", "treeHeight(B)"],
    variables: { root: "B" },
  },
  {
    narration: "B has no left child. Line 3 recurses again: treeHeight(B->left) = treeHeight(nullptr).",
    highlightLine: 3,
    callStack: ["treeHeight(A)", "treeHeight(B)", "treeHeight(nullptr)"],
    variables: { root: "nullptr" },
  },
  {
    narration: "Inside this call, root == nullptr is true — the base case fires immediately, before root->left is ever touched.",
    highlightLine: 2,
    callStack: ["treeHeight(A)", "treeHeight(B)", "treeHeight(nullptr)"],
    variables: { root: "nullptr", return_value: "0" },
  },
  {
    narration: "treeHeight(nullptr) returns 0 and its frame pops off the stack. That 0 — not 1 — is what B's call receives back.",
    highlightLine: 2,
    callStack: ["treeHeight(A)", "treeHeight(B)"],
    variables: { return_value: "0" },
  },
];
