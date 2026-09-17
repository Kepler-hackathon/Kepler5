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
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        {/* FAQ section */}
        <FaqTab
          moduleId={moduleId}
          lectureId={lectureId}
          slideId={slideId}
          slideNumber={slideNumber}
          lectureNumber={lectureNumber}
        />

        {/* Divider */}
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="h-px flex-1 bg-hairline" />
          <span className="rounded-full border border-hairline bg-surface-card px-2 py-0.5 text-[10px] font-semibold font-body uppercase tracking-wider text-muted">
            AI Tutor
          </span>
          <div className="h-px flex-1 bg-hairline" />
        </div>

        {/* AI section */}
        <CopilotTab
          lectureId={lectureId}
          slideId={slideId ?? undefined}
          slideNumber={slideNumber}
          lectureNumber={lectureNumber}
        />
      </div>
    </div>
  );
}
