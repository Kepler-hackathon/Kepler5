import { Analytics } from "@/components/analytics/analytics";

export default async function AnalyticsPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  return <Analytics courseId={courseId} />;
}
