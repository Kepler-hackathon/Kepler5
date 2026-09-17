import { notFound } from "next/navigation";
import { courseById } from "@/lib/data/courses";
import { Forum } from "@/components/forum/forum";

export default async function ForumPage(props: PageProps<"/course/[courseId]/forum">) {
  const { courseId } = await props.params;
  const course = courseById(courseId);
  if (!course) notFound();

  return <Forum courseId={course.id} />;
}
