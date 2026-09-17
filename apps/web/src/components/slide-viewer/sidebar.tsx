import { Tabs, TabList, TabTrigger, TabPanel } from "@/components/ui/tabs";
import { FaqTab } from "./faq-tab";
import { CopilotTab } from "@/components/copilot/copilot-tab";

export function Sidebar({
  slideNumber,
  lectureNumber,
  moduleId,
  lectureId,
  slideId,
}: {
  slideNumber: number;
  lectureNumber: number;
  moduleId: string;
  lectureId: string;
  slideId: string | null;
}) {
  return (
    <Tabs defaultValue="faq" className="flex h-full flex-col">
      <div className="px-4 pt-3">
        <TabList>
          <TabTrigger value="faq">Slide FAQ</TabTrigger>
          <TabTrigger value="copilot">AI Copilot</TabTrigger>
        </TabList>
      </div>
      <TabPanel value="faq" className="min-h-0 flex-1">
        <FaqTab moduleId={moduleId} lectureId={lectureId} slideId={slideId} slideNumber={slideNumber} lectureNumber={lectureNumber} />
      </TabPanel>
      <TabPanel value="copilot" className="min-h-0 flex-1">
        <CopilotTab lectureId={lectureId} slideId={slideId ?? undefined} slideNumber={slideNumber} lectureNumber={lectureNumber} />
      </TabPanel>
    </Tabs>
  );
}
