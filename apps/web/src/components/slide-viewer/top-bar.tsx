import Link from "next/link";
import { ArrowsOut, ArrowsIn, SidebarSimple, CaretLeft, CaretRight, Presentation, BookmarkSimple } from "@phosphor-icons/react";
import { IconButton } from "@/components/ui/button";

export function TopBar({
  courseId,
  moduleId,
  lectureNumber,
  lectureTitle,
  moduleTitle,
  counterLabel,
  fullscreen,
  onToggleFullscreen,
  onToggleSidebar,
  onPresent,
  totalSlides,
  currentSlide,
}: {
  courseId: string;
  moduleId: string;
  lectureNumber: number;
  lectureTitle: string;
  moduleTitle: string;
  counterLabel: string;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
  onToggleSidebar: () => void;
  onPresent: () => void;
  totalSlides?: number;
  currentSlide?: number;
}) {
  const dotCount = Math.min(totalSlides ?? 0, 24);
  const dotSlides = dotCount > 0 ? Array.from({ length: dotCount }, (_, i) => i + 1) : [];
  const pct = currentSlide && totalSlides ? Math.round((currentSlide / totalSlides) * 100) : 0;

  return (
    <div className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-hairline bg-surface-lowest/80 backdrop-blur-sm px-6">
      {/* Left: back + lecture badge + breadcrumb */}
      <div className="flex min-w-0 items-center gap-2">
        <IconButton label="Back to module" asChild>
          <Link href={`/course/${courseId}/module/${moduleId}`}>
            <CaretLeft />
          </Link>
        </IconButton>
        <span className="inline-flex items-center gap-1.5 shrink-0 rounded-full bg-primary-fixed/40 px-2.5 py-1 text-[11px] font-semibold font-body uppercase tracking-wide text-on-surface-variant">
          <span className="size-1.5 rounded-full bg-button-primary" />
          Lecture {lectureNumber}
        </span>
        <CaretRight className="size-3.5 shrink-0 text-muted" />
        <div className="flex min-w-0 items-center gap-1.5 truncate">
          <span className="shrink-0 text-[12px] text-muted font-body">{counterLabel}:</span>
          <span className="truncate text-[14px] font-medium font-headline text-ink">{lectureTitle}</span>
        </div>
      </div>

      {/* Center: dot progress strip */}
      {dotSlides.length > 0 && (
        <div className="hidden xl:flex items-center gap-1 shrink-0 rounded-full bg-surface-card px-4 py-1.5">
          {dotSlides.map((n) => (
            <span
              key={n}
              className={
                n === currentSlide
                  ? "size-2.5 rounded-full bg-button-primary ring-2 ring-primary-fixed animate-pulse"
                  : n < (currentSlide ?? 0)
                    ? "size-1.5 rounded-full bg-button-primary/40"
                    : "size-1.5 rounded-full bg-outline-variant"
              }
            />
          ))}
          <span className="ml-2 border-l border-hairline pl-2 text-[11px] text-muted font-body">{pct}%</span>
        </div>
      )}

      {/* Right: icon buttons */}
      <div className="flex shrink-0 items-center gap-1">
        <IconButton label="Present" onClick={onPresent}>
          <Presentation />
        </IconButton>
        <IconButton label="Bookmark slide">
          <BookmarkSimple />
        </IconButton>
        <IconButton label="Toggle help sidebar" onClick={onToggleSidebar} className="lg:hidden">
          <SidebarSimple />
        </IconButton>
        <IconButton label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"} onClick={onToggleFullscreen}>
          {fullscreen ? <ArrowsIn /> : <ArrowsOut />}
        </IconButton>
      </div>
    </div>
  );
}
