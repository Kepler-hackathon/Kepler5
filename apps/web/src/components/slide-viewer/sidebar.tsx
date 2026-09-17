import { Tabs, TabList, TabTrigger, TabPanel } from "@/components/ui/tabs";
import { FaqTab } from "./faq-tab";
import { CopilotTab } from "@/components/copilot/copilot-tab";
import type { FaqThread } from "@/lib/data/types";

export function Sidebar({
  slideNumber,
  lectureNumber,
  faqThreads,
}: {
  slideNumber: number;
  lectureNumber: number;
  faqThreads: FaqThread[];
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
        <FaqTab threads={faqThreads} slideNumber={slideNumber} lectureNumber={lectureNumber} />
      </TabPanel>
      <TabPanel value="copilot" className="min-h-0 flex-1">
        <CopilotTab slideNumber={slideNumber} lectureNumber={lectureNumber} />
      </TabPanel>
    </Tabs>
  );
}
