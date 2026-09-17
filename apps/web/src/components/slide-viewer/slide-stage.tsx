import type { Slide } from "@/lib/data/types";
import { BinaryTreeDiagram } from "./binary-tree-diagram";

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="overflow-x-auto rounded-[var(--radius-control)] bg-surface-dark p-5 font-code text-[14px] leading-7 text-on-dark">
      <code>{code}</code>
    </pre>
  );
}

export function SlideStage({ slide }: { slide: Slide }) {
  return (
    <div className="flex h-full flex-col justify-center rounded-[var(--radius-card)] bg-canvas px-10 py-10 sm:px-14">
      <p className="text-[13px] font-medium font-body uppercase tracking-[1px] text-accent-text">
        Slide {slide.displayNumber}
      </p>
      <h2 className="mt-2 max-w-3xl">{slide.title}</h2>

      {slide.layout === "code-diagram" && slide.code ? (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <CodeBlock code={slide.code} />
          <div className="flex justify-center">
            <BinaryTreeDiagram className="w-full max-w-xs" />
          </div>
        </div>
      ) : null}

      {slide.layout === "code" && slide.code ? <div className="mt-8 max-w-2xl">{<CodeBlock code={slide.code} />}</div> : null}

      {slide.layout === "title-bullets" && slide.bullets ? (
        <p className="mt-6 max-w-2xl text-[20px] leading-relaxed text-body font-body">{slide.bullets[0]}</p>
      ) : null}

      {slide.takeaway && slide.layout !== "title-bullets" ? (
        <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-muted font-body">{slide.takeaway}</p>
      ) : null}
    </div>
  );
}
