import { notFound } from "next/navigation";
import { courseById } from "@/lib/data/courses";
import { ReviewQueue } from "@/components/review-queue/review-queue";

export default async function ReviewPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const course = courseById(courseId);
  if (!course) notFound();

  return <ReviewQueue courseId={course.id} />;
}
