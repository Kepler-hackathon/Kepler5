export interface Module {
  id: string;
  number: number;
  title: string;
  firstLectureNumber: number;
  lastLectureNumber: number;
  totalLectures: number;
  completedLectures: number;
  /** Set when a lecture in this module is started but not finished (frontend plan D10: completion = last slide viewed). */
  inProgressLectureNumber?: number;
  interactiveWidgetCount: number;
  openQuestionCount: number;
}

export const modules: Module[] = [
  {
    id: "module-1",
    number: 1,
    title: "Arrays & Complexity Analysis",
    firstLectureNumber: 1,
    lastLectureNumber: 3,
    totalLectures: 3,
    completedLectures: 3,
    interactiveWidgetCount: 2,
    openQuestionCount: 0,
  },
  {
    id: "module-2",
    number: 2,
    title: "Linked Lists & Stacks",
    firstLectureNumber: 4,
    lastLectureNumber: 7,
    totalLectures: 4,
    completedLectures: 4,
    interactiveWidgetCount: 3,
    openQuestionCount: 1,
  },
  {
    id: "module-3",
    number: 3,
    title: "Trees & Recursion",
    firstLectureNumber: 8,
    lastLectureNumber: 13,
    totalLectures: 6,
    completedLectures: 0,
    inProgressLectureNumber: 8,
    interactiveWidgetCount: 4,
    openQuestionCount: 3,
  },
  {
    id: "module-4",
    number: 4,
    title: "Graphs & Traversal",
    firstLectureNumber: 14,
    lastLectureNumber: 18,
    totalLectures: 5,
    completedLectures: 0,
    interactiveWidgetCount: 0,
    openQuestionCount: 0,
  },
];

export function courseProgress() {
  const totalLectures = modules.reduce((sum, m) => sum + m.totalLectures, 0);
  const doneLectures = modules.reduce(
    (sum, m) => sum + m.completedLectures + (m.inProgressLectureNumber ? 0.5 : 0),
    0
  );
  return Math.round((doneLectures / totalLectures) * 100);
}

export function totalOpenQuestions() {
  return modules.reduce((sum, m) => sum + m.openQuestionCount, 0);
}
