export type PeerWidgetStatus = "collecting" | "in-review" | "changes-requested" | "merged" | "archived";

export interface PeerWidget {
  id: string;
  title: string;
  explanation: string;
  typeBadge: string;
  creator: string;
  sourceLecture: number;
  status: PeerWidgetStatus;
  upvotes: number;
  threshold: number;
  isMine: boolean;
  archivedReason?: string;
}

export const PEER_WIDGET_STATUS_LABEL: Record<PeerWidgetStatus, string> = {
  collecting: "Collecting upvotes",
  "in-review": "In teacher review",
  "changes-requested": "Changes requested",
  merged: "Merged into lesson",
  archived: "Archived",
};

export const peerWidgets: PeerWidget[] = [
  {
    id: "pw1",
    title: "Why treeHeight(nullptr) returns 0",
    explanation:
      "Steps through the base case of the recursive height function, showing the call stack unwind to a leaf's null children.",
    typeBadge: "Stepper · Recursion Stack",
    creator: "You",
    sourceLecture: 8,
    status: "collecting",
    upvotes: 3,
    threshold: 5,
    isMine: true,
  },
  {
    id: "pw2",
    title: "Amortized cost of dynamic array doubling",
    explanation: "A slider showing total copy cost vs. number of appends as the doubling threshold changes.",
    typeBadge: "Slider · Big-O Growth",
    creator: "Priya N.",
    sourceLecture: 2,
    status: "in-review",
    upvotes: 6,
    threshold: 5,
    isMine: false,
  },
  {
    id: "pw3",
    title: "Balancing an AVL tree after insertion",
    explanation: "Predict which rotation fires, then watch the tree rebalance step by step.",
    typeBadge: "Predict & Check · AVL Rotation",
    creator: "Marcus T.",
    sourceLecture: 9,
    status: "changes-requested",
    upvotes: 5,
    threshold: 5,
    isMine: false,
  },
  {
    id: "pw4",
    title: "BFS vs. DFS frontier comparison",
    explanation: "Runs both traversals on the same graph side by side, highlighting the frontier at each step.",
    typeBadge: "Stepper · Graph Traversal",
    creator: "Alex K.",
    sourceLecture: 15,
    status: "merged",
    upvotes: 9,
    threshold: 5,
    isMine: false,
  },
  {
    id: "pw5",
    title: "Stack-based parenthesis checker, one char at a time",
    explanation: "Feeds an expression in character by character and shows the stack's contents at each step.",
    typeBadge: "Stepper · Stack Trace",
    creator: "Jordan P.",
    sourceLecture: 5,
    status: "archived",
    upvotes: 2,
    threshold: 5,
    isMine: false,
    archivedReason: "Duplicate of an already-merged widget",
  },
];
