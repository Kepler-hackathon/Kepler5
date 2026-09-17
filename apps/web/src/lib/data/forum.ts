import { faqThreads as lecture8Threads } from "./lecture-8";
import type { FaqThread } from "./types";

export interface ForumThread extends FaqThread {
  moduleNumber: number;
  isLogistics?: boolean;
  body: string;
}

/** Course-wide forum threads: Lecture 8's threads plus a few from earlier in the course. */
export const forumThreads: ForumThread[] = [
  ...lecture8Threads.map((t) => ({
    ...t,
    moduleNumber: 3,
    body:
      t.id === "faq-1"
        ? "I get that we need SOME check, but why check it on `root` specifically instead of checking `root->left` and `root->right` before the recursive calls?"
        : "Textbook 3.2 says O(n) for balanced trees, but doesn't say what happens if the tree degenerates into a line.",
  })),
  {
    id: "faq-4",
    title: "Is the midterm cumulative or just Modules 1–2?",
    author: "Priya N.",
    timeAgo: "3 days ago",
    endorsed: true,
    replyCount: 6,
    upvotes: 14,
    scope: "lecture",
    moduleNumber: 2,
    isLogistics: true,
    body: "The syllabus says \"midterm covers linear structures\" but Lecture 1's Big-O material feels foundational too. Does that count?",
  },
  {
    id: "faq-5",
    title: "Why does doubling the array size specifically give O(1) amortized, not just \"fast\"?",
    author: "Marcus T.",
    timeAgo: "5 days ago",
    endorsed: false,
    replyCount: 2,
    upvotes: 7,
    scope: "lecture",
    moduleNumber: 1,
    body: "I can see it's fast in practice but I'm stuck on the actual amortized-cost proof from lecture.",
  },
  {
    id: "faq-6",
    title: "Office hours moved this week?",
    author: "Jordan P.",
    timeAgo: "1 week ago",
    endorsed: false,
    replyCount: 1,
    upvotes: 2,
    scope: "lecture",
    moduleNumber: 1,
    isLogistics: true,
    body: "Saw a conflicting time on the calendar invite vs. the syllabus PDF — which is current?",
  },
];
