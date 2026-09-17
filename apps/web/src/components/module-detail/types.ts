export interface ApiLecture {
  id: string;
  moduleId: string;
  title: string;
  orderIndex: number;
  deckFileId: string | null;
  parseStatus: "pending" | "converting" | "rendering" | "extracting" | "parsed" | "failed" | "unreadable";
  slideCount: number | null;
  progress?: { maxSlideIndex: number; completedAt: string | null } | null;
}

export interface ApiModuleDetail {
  id: string;
  courseId: string;
  name: string;
  overviewMd: string | null;
  objectives: string[];
  status: "draft" | "processing" | "needs_attention" | "ready_to_review" | "published";
  orderIndex: number | null;
}
