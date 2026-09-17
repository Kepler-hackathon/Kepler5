import { notFound } from "next/navigation";
import { courseById } from "@/lib/data/courses";
import { Analytics } from "@/components/analytics/analytics";

export default async function AnalyticsPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const course = courseById(courseId);
  if (!course) notFound();

  return <Analytics courseId={course.id} />;
}
