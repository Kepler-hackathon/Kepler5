import { ModuleDetail } from "@/components/module-detail/module-detail";

export default async function ModuleDetailPage(props: PageProps<"/course/[courseId]/module/[moduleId]">) {
  const { courseId, moduleId } = await props.params;
  return <ModuleDetail courseId={courseId} moduleId={moduleId} />;
}
