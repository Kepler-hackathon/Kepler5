export interface MasteryCell {
  lectureNumber: number;
  lectureTitle: string;
  attempts: number;
  correct: number;
}

/** Fewer than 3 attempts renders as "Not enough data", never a fake 0%/100% (frontend plan S7). */
export const mastery: MasteryCell[] = [
  { lectureNumber: 1, lectureTitle: "Big-O Notation & Growth Rates", attempts: 6, correct: 6 },
  { lectureNumber: 2, lectureTitle: "Arrays and Amortized Analysis", attempts: 5, correct: 4 },
  { lectureNumber: 3, lectureTitle: "Two-Pointer and Sliding Window", attempts: 4, correct: 3 },
  { lectureNumber: 4, lectureTitle: "Singly and Doubly Linked Lists", attempts: 7, correct: 7 },
  { lectureNumber: 5, lectureTitle: "Stacks and Balanced Parentheses", attempts: 5, correct: 5 },
  { lectureNumber: 6, lectureTitle: "Queues and Circular Buffers", attempts: 3, correct: 1 },
  { lectureNumber: 7, lectureTitle: "Linear Structures: Midterm Review", attempts: 4, correct: 3 },
  { lectureNumber: 8, lectureTitle: "Recursive Traversal", attempts: 2, correct: 1 },
  { lectureNumber: 9, lectureTitle: "Balanced Search Trees & AVL", attempts: 0, correct: 0 },
  { lectureNumber: 10, lectureTitle: "Heaps and Priority Queues", attempts: 0, correct: 0 },
  { lectureNumber: 11, lectureTitle: "Tries and Prefix Search", attempts: 0, correct: 0 },
  { lectureNumber: 12, lectureTitle: "Tree Serialization", attempts: 0, correct: 0 },
  { lectureNumber: 13, lectureTitle: "Trees & Recursion: Module Review", attempts: 0, correct: 0 },
  { lectureNumber: 14, lectureTitle: "Graph Representations", attempts: 0, correct: 0 },
  { lectureNumber: 15, lectureTitle: "Breadth-First Search", attempts: 0, correct: 0 },
  { lectureNumber: 16, lectureTitle: "DFS and Topological Sort", attempts: 0, correct: 0 },
  { lectureNumber: 17, lectureTitle: "Shortest Paths: Dijkstra's", attempts: 0, correct: 0 },
  { lectureNumber: 18, lectureTitle: "Graphs & Traversal: Module Review", attempts: 0, correct: 0 },
];

export interface MyWidget {
  id: string;
  title: string;
  sourceLecture: number;
  status: "collecting" | "in-review" | "changes-requested" | "merged" | "archived";
  upvotes: number;
  threshold: number;
  teacherNote?: string;
  archivedReason?: string;
}

/** Status labels/wording exactly match frontend plan §4.1 (this doc's Part III §4.1). */
export const myWidgets: MyWidget[] = [
  { id: "w1", title: "Why treeHeight(nullptr) returns 0", sourceLecture: 8, status: "collecting", upvotes: 3, threshold: 5 },
  {
    id: "w2",
    title: "Visualizing stack frames during in-order traversal",
    sourceLecture: 7,
    status: "changes-requested",
    upvotes: 5,
    threshold: 5,
    teacherNote: "Great idea — can you also show the call stack unwinding, not just building up?",
  },
  { id: "w3", title: "Why doubling amortizes array append to O(1)", sourceLecture: 2, status: "merged", upvotes: 8, threshold: 5 },
];

export interface MyQuestion {
  id: string;
  title: string;
  lectureNumber: number;
  hiddenByFilter: boolean;
  replyCount: number;
}

export const myQuestions: MyQuestion[] = [
  { id: "mq1", title: "Does the order of the left/right recursive calls matter for height?", lectureNumber: 8, hiddenByFilter: false, replyCount: 1 },
  { id: "mq2", title: "Is there a printed textbook or is it all posted online?", lectureNumber: 1, hiddenByFilter: true, replyCount: 0 },
];
