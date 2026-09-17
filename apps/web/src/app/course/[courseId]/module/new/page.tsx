import { ModuleSetupWizard } from "@/components/module-wizard/module-setup-wizard";

export default async function NewModulePage(props: PageProps<"/course/[courseId]/module/new">) {
  const { courseId } = await props.params;
  return <ModuleSetupWizard courseId={courseId} moduleId={null} />;
}
