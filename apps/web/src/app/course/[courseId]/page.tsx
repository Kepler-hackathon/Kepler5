import { notFound } from "next/navigation";
import { courseById } from "@/lib/data/courses";
import { CourseLanding } from "@/components/course-landing/course-landing";

export default async function CoursePage(props: PageProps<"/course/[courseId]">) {
  const { courseId } = await props.params;
  const course = courseById(courseId);
  if (!course) notFound();

  return <CourseLanding course={course} />;
}
