import type { Course, FaqThread, Interstitial, Lecture, Slide } from "./types";

export const course: Course = {
  id: "cs201",
  code: "CS 201",
  title: "Data Structures & Algorithms",
  instructor: "Dr. Priya Menon",
  term: "Fall 2026",
  hasModules: true,
};

const SYLLABUS: { title: string; takeaway: string }[] = [
  { title: "Welcome & Roadmap", takeaway: "This module moves from tree structure to recursive traversal to complexity." },
  { title: "What Is a Tree?", takeaway: "A tree is a connected, acyclic graph with one root and no cycles." },
  { title: "Binary Trees: Terminology", takeaway: "Left child, right child, leaf, and depth — the vocabulary the rest of the module reuses." },
  { title: "Tree Node Representation in C++", takeaway: "A node holds a value and two pointers, left and right, either of which may be nullptr." },
  { title: "Traversal Overview", takeaway: "Pre-order, in-order, and post-order differ only in when the current node is visited." },
  { title: "Pre-Order Traversal", takeaway: "Visit the node, then the left subtree, then the right subtree." },
  { title: "In-Order Traversal", takeaway: "On a binary search tree, in-order visits every value in sorted order." },
  { title: "Post-Order Traversal", takeaway: "Both children are fully visited before the current node — useful for deleting a tree safely." },
  { title: "Traversal Complexity", takeaway: "Every traversal visits each node exactly once: O(n) time, O(h) auxiliary stack space." },
  { title: "Recursion Refresher", takeaway: "A recursive function is one that calls itself on a smaller version of the same problem." },
  { title: "Base Cases in Recursion", takeaway: "Every recursive function needs a case that returns without recursing, or it never terminates." },
  { title: "Binary Search Trees", takeaway: "A BST keeps every left descendant smaller and every right descendant larger than the node." },
  { title: "BST Insertion", takeaway: "Insertion walks down the tree once, following the same ordering rule used to search." },
  {
    title: "Recursive Traversal — Computing Tree Height",
    takeaway: "The height of a tree is 1 plus the taller of its two subtrees' heights, and an empty tree has height 0.",
  },
  { title: "Tracing the Call Stack", takeaway: "Each recursive call waits on the stack until its children's calls return." },
  { title: "Time Complexity of Tree Algorithms", takeaway: "treeHeight visits every node once, so it runs in O(n) time regardless of shape." },
  { title: "Balanced vs. Skewed Trees", takeaway: "A skewed tree degrades to a linked list — height n instead of log n." },
  { title: "AVL Trees: Motivation", takeaway: "Self-balancing trees keep height at O(log n) by bounding how unbalanced any node can be." },
  { title: "Rotations", takeaway: "A rotation restores balance in O(1) time by re-pointing three nodes." },
  { title: "Tree Height vs. Balance Factor", takeaway: "An AVL node's balance factor is the height difference between its two subtrees, capped at 1." },
  { title: "Practice: Height of a Skewed Tree", takeaway: "A tree where every node has one child has height n — no better than a list." },
  { title: "Common Recursion Bugs", takeaway: "Missing base cases and unbounded recursion are the two most common causes of a stack overflow." },
  { title: "Null Pointer Checks", takeaway: "Checking root == nullptr before dereferencing root->left is what makes the base case safe." },
  { title: "Debugging Recursive Calls", takeaway: "A debugger's call stack view shows exactly which recursive call is currently active." },
  { title: "Tail Recursion", takeaway: "A tail-recursive call is the last action in a function, which some compilers can optimize into a loop." },
  { title: "Converting Recursion to Iteration", takeaway: "An explicit stack can replace the call stack for traversals that risk overflowing it." },
  { title: "Stack Overflow Risks", takeaway: "Recursion depth is bounded by call stack size — very tall trees can exhaust it." },
  { title: "Memory Model of Recursive Calls", takeaway: "Each call gets its own stack frame with its own copies of root, left, and right." },
  { title: "Summary: Recursion on Trees", takeaway: "Height, traversal, and search all share the same shape: solve the base case, recurse, combine." },
  { title: "Connections to Graph Traversal", takeaway: "Tree traversal is depth-first search on a graph that happens to have no cycles." },
  { title: "Preview: Heaps", takeaway: "Heaps are trees with an ordering property instead of a search property — next lecture's topic." },
  { title: "Wrap-Up & Next Steps", takeaway: "Practice quiz and the height-computation widget are both available from this lecture's page." },
];

export const slides: Slide[] = SYLLABUS.map((s, i) => {
  const number = i + 1;
  if (number === 14) {
    return {
      number,
      displayNumber: "14",
      title: s.title,
      layout: "code-diagram",
      code: `int treeHeight(Node* root) {\n  if (root == nullptr) return 0;\n  int left  = treeHeight(root->left);\n  int right = treeHeight(root->right);\n  return 1 + std::max(left, right);\n}`,
      takeaway: s.takeaway,
      slideText:
        "Slide 14, Recursive Traversal — Computing Tree Height. Shows the treeHeight function: if root is null, return 0; otherwise return 1 plus the larger of the left and right subtree heights. Diagram: a small binary tree with root A, children B and C, and B's child D, with each node annotated by its height.",
      presenterNotes:
        "Pause after showing the base case line — last year several students assumed it returned 1, not 0. Ask someone to trace treeHeight(D) out loud before advancing.",
    } satisfies Slide;
  }
  if (number === 13) {
    return {
      number,
      displayNumber: "13",
      title: s.title,
      layout: "code",
      code: `void inOrder(Node* root) {\n  if (root == nullptr) return;\n  inOrder(root->left);\n  visit(root);\n  inOrder(root->right);\n}`,
      takeaway: s.takeaway,
      slideText: "Slide 13, In-Order Traversal. Shows the inOrder function recursing left, visiting the node, then recursing right.",
    } satisfies Slide;
  }
  return {
    number,
    displayNumber: String(number),
    title: s.title,
    layout: "title-bullets",
    bullets: [s.takeaway],
    slideText: `Slide ${number}, ${s.title}. ${s.takeaway}`,
    hasOriginalMedia: [2, 5, 12, 17].includes(number) ? true : undefined,
  } satisfies Slide;
});

export const interstitials: Interstitial[] = [
  {
    afterSlide: 14,
    kind: "quiz",
    question: {
      id: "q-treeheight-null",
      prompt: "What is the return value of treeHeight(nullptr)?",
      options: [
        { id: "a", text: "0", correct: true },
        { id: "b", text: "1", correct: false, tag: "Base case confusion" },
        { id: "c", text: "-1", correct: false },
        { id: "d", text: "Undefined behavior", correct: false },
      ],
      correctExplanation:
        "root == nullptr hits the base case immediately: an empty subtree contributes no height, so the function returns 0 before touching root->left or root->right.",
    },
  },
];

export const faqThreads: FaqThread[] = [
  {
    id: "faq-1",
    title: "Why check root == nullptr before accessing root->left?",
    author: "Alex K.",
    timeAgo: "2 hours ago",
    endorsed: true,
    replyCount: 4,
    upvotes: 8,
    scope: "slide",
    slideNumber: 14,
  },
  {
    id: "faq-2",
    title: "Is in-order traversal always O(n) for skewed trees?",
    author: "Jordan P.",
    timeAgo: "yesterday",
    endorsed: false,
    replyCount: 3,
    upvotes: 5,
    scope: "slide",
    slideNumber: 14,
  },
  {
    id: "faq-3",
    title: "Does the order of the left/right recursive calls matter for height?",
    author: "Sam R.",
    timeAgo: "2 days ago",
    endorsed: false,
    replyCount: 1,
    upvotes: 2,
    scope: "lecture",
  },
];

export const lecture8: Lecture = {
  id: "lecture-8",
  courseId: course.id,
  moduleId: "module-3",
  number: 8,
  title: "Recursive Traversal",
  moduleTitle: "Module 3 · Trees & Recursion",
  totalSlides: slides.length,
  slides,
  interstitials,
  faqThreads,
};
