import { ReviewQueue } from "@/components/review-queue/review-queue";

export default async function ReviewPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  return <ReviewQueue courseId={courseId} />;
}
