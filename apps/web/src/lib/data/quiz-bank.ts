import type { QuizQuestion } from "./types";

export interface BankQuestion extends QuizQuestion {
  lectureNumber: number;
}

/** One to two real questions per lecture (frontend plan S6a builder pulls from this). */
export const QUIZ_BANK: BankQuestion[] = [
  {
    id: "q1-1",
    lectureNumber: 1,
    prompt: "What is the time complexity of binary search on a sorted array of n elements?",
    options: [
      { id: "a", text: "O(1)", correct: false },
      { id: "b", text: "O(log n)", correct: true },
      { id: "c", text: "O(n)", correct: false },
      { id: "d", text: "O(n log n)", correct: false },
    ],
    correctExplanation: "Each comparison eliminates half the remaining elements, so the search space shrinks logarithmically.",
  },
  {
    id: "q2-1",
    lectureNumber: 2,
    prompt: "Why is appending to a dynamic array considered O(1) amortized rather than O(n)?",
    options: [
      { id: "a", text: "It never needs to resize", correct: false },
      { id: "b", text: "The resize cost is spread across many cheap appends", correct: true },
      { id: "c", text: "Appends always happen at the front", correct: false },
      { id: "d", text: "The array is stored as a linked list internally", correct: false },
    ],
    correctExplanation: "Doubling the array's capacity means resizes become exponentially rarer, so their O(n) cost averages out to O(1) per append.",
  },
  {
    id: "q3-1",
    lectureNumber: 3,
    prompt: "In the two-pointer technique on a sorted array, what does advancing the left pointer typically do to the current sum?",
    options: [
      { id: "a", text: "Decreases it", correct: false },
      { id: "b", text: "Increases it", correct: true },
      { id: "c", text: "Leaves it unchanged", correct: false },
      { id: "d", text: "Resets it to zero", correct: false },
    ],
    correctExplanation: "Moving the left pointer forward drops a smaller value and picks up a larger one, since the array is sorted ascending.",
  },
  {
    id: "q4-1",
    lectureNumber: 4,
    prompt: "What is the main advantage of a doubly linked list over a singly linked list?",
    options: [
      { id: "a", text: "It uses less memory per node", correct: false },
      { id: "b", text: "It supports O(1) removal given only a pointer to the node", correct: true },
      { id: "c", text: "It supports random access", correct: false },
      { id: "d", text: "It can't have cycles", correct: false },
    ],
    correctExplanation: "With a back-pointer, a doubly linked list can splice out a node without walking from the head to find its predecessor.",
  },
  {
    id: "q5-1",
    lectureNumber: 5,
    prompt: "Which data structure is the natural choice for checking whether an expression's parentheses are balanced?",
    options: [
      { id: "a", text: "Queue", correct: false },
      { id: "b", text: "Stack", correct: true },
      { id: "c", text: "Hash map", correct: false },
      { id: "d", text: "Heap", correct: false },
    ],
    correctExplanation: "Each opening bracket is pushed and each closing bracket must match the most recently pushed one — classic LIFO behavior.",
  },
  {
    id: "q6-1",
    lectureNumber: 6,
    prompt: "What makes a circular buffer efficient for implementing a fixed-size queue?",
    options: [
      { id: "a", text: "It never runs out of space", correct: false },
      { id: "b", text: "It reuses freed slots at the front without shifting elements", correct: true },
      { id: "c", text: "It sorts elements as they're inserted", correct: false },
      { id: "d", text: "It stores elements in a tree", correct: false },
    ],
    correctExplanation: "Wrapping the read/write index around the fixed array avoids the O(n) shift a plain array queue would need after dequeuing.",
  },
  {
    id: "q7-1",
    lectureNumber: 7,
    prompt: "With a tail pointer, which of these is NOT O(1) on a singly linked list?",
    options: [
      { id: "a", text: "Insert at the head", correct: false },
      { id: "b", text: "Insert at the tail", correct: false },
      { id: "c", text: "Find the middle element", correct: true },
      { id: "d", text: "Remove the head", correct: false },
    ],
    correctExplanation: "Finding the middle still requires walking from the head, since there's no random access — that's O(n).",
  },
  {
    id: "q8-1",
    lectureNumber: 8,
    prompt: "What is the return value of treeHeight(nullptr)?",
    options: [
      { id: "a", text: "0", correct: true },
      { id: "b", text: "1", correct: false },
      { id: "c", text: "-1", correct: false },
      { id: "d", text: "Undefined behavior", correct: false },
    ],
    correctExplanation: "root == nullptr hits the base case immediately and returns 0 before any dereference happens.",
  },
  {
    id: "q8-2",
    lectureNumber: 8,
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
    id: "q9-1",
    lectureNumber: 9,
    prompt: "In an AVL tree, what is the maximum allowed difference in height between a node's two subtrees?",
    options: [
      { id: "a", text: "0", correct: false },
      { id: "b", text: "1", correct: true },
      { id: "c", text: "2", correct: false },
      { id: "d", text: "log n", correct: false },
    ],
    correctExplanation: "A balance factor beyond 1 in either direction triggers a rotation to restore the AVL invariant.",
  },
  {
    id: "q10-1",
    lectureNumber: 10,
    prompt: "In a min-heap, where is the smallest element always located?",
    options: [
      { id: "a", text: "At the root", correct: true },
      { id: "b", text: "At the last leaf", correct: false },
      { id: "c", text: "At the deepest level", correct: false },
      { id: "d", text: "Its position isn't guaranteed", correct: false },
    ],
    correctExplanation: "The heap property guarantees every parent is ≤ its children, so the minimum bubbles up to the root.",
  },
  {
    id: "q11-1",
    lectureNumber: 11,
    prompt: "What's the main advantage of a trie over a hash set for storing strings?",
    options: [
      { id: "a", text: "Lower memory use in all cases", correct: false },
      { id: "b", text: "Efficient prefix queries, like autocomplete", correct: true },
      { id: "c", text: "O(1) lookup regardless of string length", correct: false },
      { id: "d", text: "It keeps strings sorted automatically", correct: false },
    ],
    correctExplanation: "Shared prefixes share the same path in the trie, so \"find everything starting with...\" is a simple subtree walk.",
  },
  {
    id: "q12-1",
    lectureNumber: 12,
    prompt: "Why is a pre-order traversal commonly used to serialize a binary tree?",
    options: [
      { id: "a", text: "It's the fastest traversal", correct: false },
      { id: "b", text: "It records the root before its subtrees, preserving structure for deserialization", correct: true },
      { id: "c", text: "It only works on balanced trees", correct: false },
      { id: "d", text: "It requires the least memory", correct: false },
    ],
    correctExplanation: "Reading the root first lets the deserializer know where each subtree starts as it rebuilds the tree.",
  },
  {
    id: "q13-1",
    lectureNumber: 13,
    prompt: "Which traversal visits a binary search tree's nodes in ascending sorted order?",
    options: [
      { id: "a", text: "Pre-order", correct: false },
      { id: "b", text: "Post-order", correct: false },
      { id: "c", text: "In-order", correct: true },
      { id: "d", text: "Level-order", correct: false },
    ],
    correctExplanation: "In-order visits left subtree, node, right subtree — which matches ascending order in a BST by construction.",
  },
  {
    id: "q14-1",
    lectureNumber: 14,
    prompt: "For a sparse graph, which representation typically uses less memory?",
    options: [
      { id: "a", text: "Adjacency matrix", correct: false },
      { id: "b", text: "Adjacency list", correct: true },
      { id: "c", text: "They use the same memory", correct: false },
      { id: "d", text: "Edge list sorted by weight", correct: false },
    ],
    correctExplanation: "An adjacency matrix always costs O(V²); a list only stores the edges that actually exist.",
  },
  {
    id: "q15-1",
    lectureNumber: 15,
    prompt: "What data structure does breadth-first search use to determine visit order?",
    options: [
      { id: "a", text: "A stack", correct: false },
      { id: "b", text: "A queue", correct: true },
      { id: "c", text: "A priority queue", correct: false },
      { id: "d", text: "A hash set only", correct: false },
    ],
    correctExplanation: "FIFO ordering is what makes BFS explore level by level, visiting all distance-1 nodes before any distance-2 node.",
  },
  {
    id: "q16-1",
    lectureNumber: 16,
    prompt: "Topological sort is only defined for what kind of graph?",
    options: [
      { id: "a", text: "Any undirected graph", correct: false },
      { id: "b", text: "A directed acyclic graph (DAG)", correct: true },
      { id: "c", text: "A weighted graph", correct: false },
      { id: "d", text: "A tree only", correct: false },
    ],
    correctExplanation: "A cycle would force a node to come before itself in the ordering, which is impossible.",
  },
  {
    id: "q17-1",
    lectureNumber: 17,
    prompt: "Dijkstra's algorithm produces incorrect shortest paths if the graph has what property?",
    options: [
      { id: "a", text: "Disconnected components", correct: false },
      { id: "b", text: "Negative edge weights", correct: true },
      { id: "c", text: "Cycles", correct: false },
      { id: "d", text: "More than 1000 nodes", correct: false },
    ],
    correctExplanation: "Dijkstra assumes once a node is finalized its distance can't improve — a negative edge can violate that assumption.",
  },
  {
    id: "q18-1",
    lectureNumber: 18,
    prompt: "What's the time complexity of BFS/DFS on a graph with V vertices and E edges (adjacency list)?",
    options: [
      { id: "a", text: "O(V)", correct: false },
      { id: "b", text: "O(V + E)", correct: true },
      { id: "c", text: "O(V × E)", correct: false },
      { id: "d", text: "O(V²)", correct: false },
    ],
    correctExplanation: "Each vertex is visited once and each edge is examined once when scanning its adjacency list.",
  },
];

export function questionsForLectures(lectureNumbers: number[]): BankQuestion[] {
  return QUIZ_BANK.filter((q) => lectureNumbers.includes(q.lectureNumber));
}
