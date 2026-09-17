import { CourseDetailsEditor } from "@/components/course-settings/course-details-editor";

export default async function CourseSettingsPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  return <CourseDetailsEditor courseId={courseId} />;
}
