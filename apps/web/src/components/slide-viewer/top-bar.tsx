import Link from "next/link";
import { ArrowsOut, ArrowsIn, SidebarSimple, CaretLeft, Presentation } from "@phosphor-icons/react";
import { IconButton } from "@/components/ui/button";

export function TopBar({
  courseId,
  lectureNumber,
  lectureTitle,
  moduleTitle,
  counterLabel,
  fullscreen,
  onToggleFullscreen,
  onToggleSidebar,
  onPresent,
}: {
  courseId: string;
  lectureNumber: number;
  lectureTitle: string;
  moduleTitle: string;
  counterLabel: string;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
  onToggleSidebar: () => void;
  onPresent: () => void;
}) {
  return (
    <div className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-hairline bg-canvas px-6">
      <div className="flex min-w-0 items-center gap-3">
        <IconButton label="Back to course landing" asChild>
          <Link href={`/course/${courseId}`}>
            <CaretLeft />
          </Link>
        </IconButton>
        <div className="min-w-0">
          <p className="truncate text-[12px] text-muted font-body">{moduleTitle}</p>
          <p className="truncate text-[14px] font-medium font-body text-ink">
            Lecture {lectureNumber} · {lectureTitle}
            <span className="ml-2 font-normal text-muted">{counterLabel}</span>
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <IconButton label="Present" onClick={onPresent}>
          <Presentation />
        </IconButton>
        <IconButton label="Toggle help sidebar" onClick={onToggleSidebar} className="xl:hidden">
          <SidebarSimple />
        </IconButton>
        <IconButton label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"} onClick={onToggleFullscreen}>
          {fullscreen ? <ArrowsIn /> : <ArrowsOut />}
        </IconButton>
      </div>
    </div>
  );
}
