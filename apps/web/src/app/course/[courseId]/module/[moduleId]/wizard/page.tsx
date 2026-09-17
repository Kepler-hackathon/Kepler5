import { ModuleSetupWizard } from "@/components/module-wizard/module-setup-wizard";

export default async function ModuleWizardPage(props: PageProps<"/course/[courseId]/module/[moduleId]/wizard">) {
  const { courseId, moduleId } = await props.params;
  return <ModuleSetupWizard courseId={courseId} moduleId={moduleId} />;
}
