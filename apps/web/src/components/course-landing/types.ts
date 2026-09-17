export interface ApiModule {
  id: string;
  courseId: string;
  name: string;
  orderIndex: number | null;
  status: "draft" | "processing" | "needs_attention" | "ready_to_review" | "published";
  overviewMd: string | null;
  objectives: string[];
  scheduleNotes: string | null;
  aiOptIn: boolean;
  itemsPerLecture: number;
}
