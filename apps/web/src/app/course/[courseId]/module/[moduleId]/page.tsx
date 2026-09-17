import { notFound } from "next/navigation";
import { courseById } from "@/lib/data/courses";
import { moduleById } from "@/lib/data/curriculum";
import { ModuleDetail } from "@/components/module-detail/module-detail";

export default async function ModuleDetailPage(props: PageProps<"/course/[courseId]/module/[moduleId]">) {
  const { courseId, moduleId } = await props.params;
  const course = courseById(courseId);
  const moduleData = moduleById(moduleId);
  if (!course || !moduleData || !course.hasModules) notFound();

  return <ModuleDetail course={course} module={moduleData} />;
}
