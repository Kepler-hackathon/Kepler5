export interface LectureSummary {
  number: number;
  title: string;
  /** Only Lecture 8 has authored slide content in this build. */
  hasContent: boolean;
  status: "done" | "in-progress" | "not-started";
  /** Slide to resume at, only meaningful when status is in-progress and hasContent. */
  resumeSlide?: number;
}

export interface ModuleDetail {
  id: string;
  number: number;
  title: string;
  overview: string;
  objectives: string[];
  lectures: LectureSummary[];
}

/**
 * Lecture-level curriculum across the whole course (distinct from lecture-8.ts's
 * SYLLABUS, which is the 32 *slides* inside Lecture 8 alone). Only Lecture 8 has real
 * slide content; the rest exist so Module Detail and the Quiz Builder have a real
 * curriculum to select from.
 */
export const moduleDetails: ModuleDetail[] = [
  {
    id: "module-1",
    number: 1,
    title: "Arrays & Complexity Analysis",
    overview:
      "How to measure an algorithm's cost independent of hardware, and the array-backed structures that make good use of that cost model. By the end, you'll be able to read and write Big-O bounds and reason about amortized cost.",
    objectives: [
      "State and compare the common growth rates (O(1), O(log n), O(n), O(n log n), O(n²))",
      "Explain why dynamic array append is O(1) amortized",
      "Apply the two-pointer and sliding-window patterns to array problems",
    ],
    lectures: [
      { number: 1, title: "Big-O Notation & Growth Rates", hasContent: false, status: "done" },
      { number: 2, title: "Arrays and Amortized Analysis", hasContent: false, status: "done" },
      { number: 3, title: "Two-Pointer and Sliding Window Techniques", hasContent: false, status: "done" },
    ],
  },
  {
    id: "module-2",
    number: 2,
    title: "Linked Lists & Stacks",
    overview:
      "Moving from contiguous arrays to pointer-based structures. Covers singly and doubly linked lists, then the two classic linear ADTs built on top of them: stacks and queues.",
    objectives: [
      "Implement insertion and deletion on singly and doubly linked lists",
      "Use a stack to validate balanced expressions",
      "Explain the tradeoffs between an array-backed and pointer-backed queue",
    ],
    lectures: [
      { number: 4, title: "Singly and Doubly Linked Lists", hasContent: false, status: "done" },
      { number: 5, title: "Stacks and Balanced Parentheses", hasContent: false, status: "done" },
      { number: 6, title: "Queues and Circular Buffers", hasContent: false, status: "done" },
      { number: 7, title: "Linear Structures: Midterm Review", hasContent: false, status: "done" },
    ],
  },
  {
    id: "module-3",
    number: 3,
    title: "Trees & Recursion",
    overview:
      "Trees as a recursive data structure, and recursion as the natural tool for working with them. This module builds from basic traversal up through balanced trees, heaps, and tries.",
    objectives: [
      "Trace a recursive function's call stack by hand",
      "Compute the height and balance factor of a binary tree",
      "Choose between a BST, heap, or trie for a given problem",
    ],
    lectures: [
      { number: 8, title: "Recursive Traversal", hasContent: true, status: "in-progress", resumeSlide: 14 },
      { number: 9, title: "Balanced Search Trees & AVL Rotations", hasContent: false, status: "not-started" },
      { number: 10, title: "Heaps and Priority Queues", hasContent: false, status: "not-started" },
      { number: 11, title: "Tries and Prefix Search", hasContent: false, status: "not-started" },
      { number: 12, title: "Tree Serialization", hasContent: false, status: "not-started" },
      { number: 13, title: "Trees & Recursion: Module Review", hasContent: false, status: "not-started" },
    ],
  },
  {
    id: "module-4",
    number: 4,
    title: "Graphs & Traversal",
    overview:
      "Generalizing trees to graphs: representations, the two fundamental traversal orders, and the shortest-path problem. The module closes with Dijkstra's algorithm.",
    objectives: [
      "Choose between an adjacency matrix and adjacency list for a given graph",
      "Implement BFS and DFS and know when each applies",
      "Explain why Dijkstra's algorithm requires non-negative edge weights",
    ],
    lectures: [
      { number: 14, title: "Graph Representations", hasContent: false, status: "not-started" },
      { number: 15, title: "Breadth-First Search", hasContent: false, status: "not-started" },
      { number: 16, title: "Depth-First Search and Topological Sort", hasContent: false, status: "not-started" },
      { number: 17, title: "Shortest Paths: Dijkstra's Algorithm", hasContent: false, status: "not-started" },
      { number: 18, title: "Graphs & Traversal: Module Review", hasContent: false, status: "not-started" },
    ],
  },
];

export function moduleById(id: string) {
  return moduleDetails.find((m) => m.id === id);
}

export function lectureByNumber(number: number): { lecture: LectureSummary; module: ModuleDetail } | undefined {
  for (const mod of moduleDetails) {
    const lecture = mod.lectures.find((l) => l.number === number);
    if (lecture) return { lecture, module: mod };
  }
  return undefined;
}
