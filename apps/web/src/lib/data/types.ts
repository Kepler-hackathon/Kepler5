export type SlideLayout = "title-bullets" | "code-diagram" | "code" | "summary";

export interface Slide {
  number: number;
  displayNumber: string; // "14" or "14a" for supplementary slides
  title: string;
  layout: SlideLayout;
  bullets?: string[];
  code?: string;
  takeaway?: string;
  /** Screen-reader / low-bandwidth alternative to the rendered slide (frontend plan S4 edges). */
  slideText: string;
  isSupplementary?: boolean;
  /** Presenter-only notes (S12). Hidden entirely when absent. */
  presenterNotes?: string;
}

export interface QuizOption {
  id: string;
  text: string;
  correct: boolean;
  /** Shown once selected, before the drawer opens on a wrong answer. */
  tag?: string;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: QuizOption[];
  correctExplanation: string;
}

export interface Interstitial {
  afterSlide: number;
  kind: "quiz";
  question: QuizQuestion;
}

export interface FaqThread {
  id: string;
  title: string;
  author: string;
  timeAgo: string;
  endorsed: boolean;
  replyCount: number;
  upvotes: number;
  scope: "slide" | "lecture";
  slideNumber?: number;
}

export interface Lecture {
  id: string;
  courseId: string;
  number: number;
  title: string;
  moduleTitle: string;
  totalSlides: number;
  slides: Slide[];
  interstitials: Interstitial[];
  faqThreads: FaqThread[];
}

export interface Course {
  id: string;
  code: string;
  title: string;
  instructor: string;
  term: string;
  /** Only true for the one course this build actually authored content for. */
  hasModules: boolean;
}
