import { Forum } from "@/components/forum/forum";

export default async function ForumPage(props: PageProps<"/course/[courseId]/forum">) {
  const { courseId } = await props.params;
  return <Forum courseId={courseId} />;
}
