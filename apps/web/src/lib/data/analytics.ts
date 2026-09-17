export interface ModuleStat {
  moduleNumber: number;
  moduleTitle: string;
  studentsStarted: number;
  studentsCompleted: number;
  totalEnrolled: number;
  avgQuizScore: number | null;
}

export interface LectureStat {
  lectureNumber: number;
  lectureTitle: string;
  totalAttempts: number;
  avgAccuracy: number | null;
}

export const classStats = {
  enrolled: 84,
  activeThisWeek: 23,
  avgQuizScore: 71,
  openQuestions: 4,
};

export const moduleStats: ModuleStat[] = [
  { moduleNumber: 1, moduleTitle: "Arrays & Complexity Analysis", studentsStarted: 84, studentsCompleted: 79, totalEnrolled: 84, avgQuizScore: 82 },
  { moduleNumber: 2, moduleTitle: "Linked Lists & Stacks", studentsStarted: 78, studentsCompleted: 61, totalEnrolled: 84, avgQuizScore: 74 },
  { moduleNumber: 3, moduleTitle: "Trees & Recursion", studentsStarted: 34, studentsCompleted: 8, totalEnrolled: 84, avgQuizScore: 58 },
  { moduleNumber: 4, moduleTitle: "Graphs & Traversal", studentsStarted: 2, studentsCompleted: 0, totalEnrolled: 84, avgQuizScore: null },
];

export const lectureStats: LectureStat[] = [
  { lectureNumber: 1, lectureTitle: "Big-O Notation & Growth Rates", totalAttempts: 412, avgAccuracy: 88 },
  { lectureNumber: 2, lectureTitle: "Arrays and Amortized Analysis", totalAttempts: 398, avgAccuracy: 79 },
  { lectureNumber: 3, lectureTitle: "Two-Pointer and Sliding Window", totalAttempts: 341, avgAccuracy: 72 },
  { lectureNumber: 4, lectureTitle: "Singly and Doubly Linked Lists", totalAttempts: 320, avgAccuracy: 84 },
  { lectureNumber: 5, lectureTitle: "Stacks and Balanced Parentheses", totalAttempts: 308, avgAccuracy: 81 },
  { lectureNumber: 6, lectureTitle: "Queues and Circular Buffers", totalAttempts: 271, avgAccuracy: 48 },
  { lectureNumber: 7, lectureTitle: "Linear Structures: Midterm Review", totalAttempts: 289, avgAccuracy: 76 },
  { lectureNumber: 8, lectureTitle: "Recursive Traversal", totalAttempts: 143, avgAccuracy: 54 },
  { lectureNumber: 9, lectureTitle: "Balanced Search Trees & AVL", totalAttempts: 67, avgAccuracy: 41 },
  { lectureNumber: 10, lectureTitle: "Heaps and Priority Queues", totalAttempts: 28, avgAccuracy: null },
  { lectureNumber: 11, lectureTitle: "Tries and Prefix Search", totalAttempts: 0, avgAccuracy: null },
  { lectureNumber: 12, lectureTitle: "Tree Serialization", totalAttempts: 0, avgAccuracy: null },
  { lectureNumber: 13, lectureTitle: "Trees & Recursion: Module Review", totalAttempts: 0, avgAccuracy: null },
  { lectureNumber: 14, lectureTitle: "Graph Representations", totalAttempts: 0, avgAccuracy: null },
  { lectureNumber: 15, lectureTitle: "Breadth-First Search", totalAttempts: 0, avgAccuracy: null },
  { lectureNumber: 16, lectureTitle: "DFS and Topological Sort", totalAttempts: 0, avgAccuracy: null },
  { lectureNumber: 17, lectureTitle: "Shortest Paths: Dijkstra’s", totalAttempts: 0, avgAccuracy: null },
  { lectureNumber: 18, lectureTitle: "Graphs & Traversal: Module Review", totalAttempts: 0, avgAccuracy: null },
];
