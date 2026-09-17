import { CaretRight } from "@phosphor-icons/react";

/** Read-only "here's the order students will see" strip (Screen 8, Stage 4) — operates on the
 * wizard's own lecture list rather than reusing course-landing/flow-view.tsx's ApiModule[]
 * coupling, since this preview runs before the module is published. */
export function LectureFlowPreview({ lectures }: { lectures: Array<{ id: string; title: string }> }) {
  return (
    <div className="flex flex-wrap items-center gap-2 overflow-x-auto rounded-[var(--radius-control)] border border-hairline bg-canvas p-3">
      {lectures.map((l, i) => (
        <div key={l.id} className="flex shrink-0 items-center gap-2">
          {i > 0 ? <CaretRight className="size-3.5 text-muted" aria-hidden /> : null}
          <span className="rounded-full border border-hairline bg-surface-card px-2.5 py-1 text-[12px] font-body text-ink">
            {l.title}
          </span>
        </div>
      ))}
    </div>
  );
}
