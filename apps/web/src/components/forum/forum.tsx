import { AppNav } from "@/components/nav/app-nav";
import { Tabs, TabList, TabTrigger, TabPanel } from "@/components/ui/tabs";
import { QuestionsTab } from "./questions-tab";
import { PeerWidgetsTab } from "./peer-widgets-tab";

export function Forum({ courseId }: { courseId: string }) {
  return (
    <div className="min-h-screen bg-canvas">
      <AppNav courseId={courseId} activeHref={`/course/${courseId}/forum`} />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1>FAQ Forum</h1>
        <Tabs defaultValue="questions" className="mt-4">
          <TabList>
            <TabTrigger value="questions">Questions</TabTrigger>
            <TabTrigger value="widgets">Peer Widgets</TabTrigger>
          </TabList>
          <TabPanel value="questions" className="mt-5">
            <QuestionsTab />
          </TabPanel>
          <TabPanel value="widgets" className="mt-5">
            <PeerWidgetsTab />
          </TabPanel>
        </Tabs>
      </main>
    </div>
  );
}
