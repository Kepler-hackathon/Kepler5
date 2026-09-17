export interface ApiSlide {
  id: string;
  index: number | null;
  subIndex: number | null;
  isSupplementary: boolean;
  afterSlideId: string | null;
  imageKey: string | null;
  thumbKey: string | null;
  width: number | null;
  height: number | null;
  text: string | null;
  content: unknown;
  notes?: string | null;
}

export interface QuizContent {
  promptMd: string;
  options: { key: string; text: string }[];
  correctKey: string;
  explanationMd?: string | null;
}

export interface ApiLectureItem {
  id: string;
  lectureId: string;
  afterSlideId: string;
  kind: "supplementary_slide" | "quiz" | "widget" | "peer_widget";
  refId: string;
  orderInSlot: number;
  status: string;
  content: unknown;
  conceptLabel: string | null;
  questionId?: string | null;
}

export interface Bundle {
  version: number;
  slides: ApiSlide[];
  items: ApiLectureItem[];
}
