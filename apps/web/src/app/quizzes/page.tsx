import { PracticeQuiz } from "@/components/quiz/practice-quiz";

export default async function QuizzesPage(props: PageProps<"/quizzes">) {
  const { lectures } = await props.searchParams;
  const raw = Array.isArray(lectures) ? lectures[0] : lectures;
  const initialSelected = raw !== undefined ? raw.split(",").filter(Boolean) : undefined;

  return <PracticeQuiz initialSelected={initialSelected} />;
}
