export type ModuleStatus = "draft" | "processing" | "needs_attention" | "ready_to_review" | "published";

export type ParseStatus = "pending" | "converting" | "rendering" | "extracting" | "parsed" | "failed" | "unreadable";

export interface ApiModuleFull {
  id: string;
  courseId: string;
  name: string;
  overviewMd: string | null;
  objectives: string[];
  scheduleNotes: string | null;
  orderIndex: number | null;
  status: ModuleStatus;
  aiOptIn: boolean;
  itemsPerLecture: number;
  createdBy: string | null;
  publishedAt: string | null;
}

export interface ApiLecture {
  id: string;
  moduleId: string;
  title: string;
  orderIndex: number;
  deckFileId: string | null;
  parseStatus: ParseStatus;
  slideCount: number | null;
}

/** A lecture row in the wizard's in-progress editing state — mirrors ApiLecture but tracks a
 * pending local File before it has an uploaded deckFileId, and an upload-progress phase. */
export interface WizardLecture {
  key: string;
  lectureId: string | null;
  title: string;
  deckFileId: string | null;
  parseStatus: ParseStatus | null;
  pendingFile: File | null;
  uploadPhase: "idle" | "uploading" | "done" | "error";
  uploadError: string | null;
}

export type AnchorKind = "textbook" | "problem_bank";

export interface WizardAnchor {
  id: string | null;
  fileId: string | null;
  kind: AnchorKind;
  fileName: string | null;
  pendingFile: File | null;
  uploadPhase: "idle" | "uploading" | "done" | "error";
  uploadError: string | null;
}

export interface ApiProcessingStatus {
  runId: string;
  status: "pending" | "running" | "done" | "failed" | "skipped";
  cancelRequested: boolean;
  startedAt: string;
  finishedAt: string | null;
  error: string | null;
  lectures: Array<{
    lectureId: string;
    parseStatus: "pending" | "running" | "done" | "failed" | "skipped";
    genStatus: "pending" | "running" | "done" | "failed" | "skipped";
    parseAttempts: number;
    genAttempts: number;
    itemsGenerated: number;
    parseError: string | null;
    genError: string | null;
  }>;
}

export interface ApiGeneratedItem {
  id: string;
  type: "quiz" | "widget";
  status: "pending" | "approved" | "discarded" | "published" | "archived";
  content: Record<string, unknown>;
  conceptLabel: string | null;
  citations: unknown[];
  sourceSlideId: string | null;
  sourceSlideGone: boolean;
  createdAt: string;
}

export interface ApiReviewLecture {
  lectureId: string;
  title: string;
  items: ApiGeneratedItem[];
}
