import { CourseLanding } from "@/components/course-landing/course-landing";

export default async function CoursePage(props: PageProps<"/course/[courseId]">) {
  const { courseId } = await props.params;
  return <CourseLanding courseId={courseId} />;
}
