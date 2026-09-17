"use client";

import * as React from "react";

export type StreamStatus = "streaming" | "done" | "stopped" | "error";

/**
 * Fakes token-by-token streaming the way the Vercel AI SDK would deliver it, without a
 * backend (frontend plan §1.1/§6.1). Reveals `fullText` a few characters at a time so the
 * UI's streaming states (Stop control, partial text, "New reply" scroll behavior) are all
 * real interaction, not a canned recording.
 */
export function useStreamingText(fullText: string, { active }: { active: boolean }) {
  const [displayed, setDisplayed] = React.useState("");
  const [status, setStatus] = React.useState<StreamStatus>("streaming");
  const stoppedRef = React.useRef(false);

  // Reset during render when `active` flips on for a new message, rather than in an
  // effect — this is React's recommended way to adjust state in response to a prop
  // change (see "you might not need an effect: adjusting state when a prop changes").
  // Refs and impure calls stay out of this block: render must stay pure, so the actual
  // stream (and the `stoppedRef` it reads) is kicked off from the effect below instead.
  const [prevActive, setPrevActive] = React.useState(active);
  if (active !== prevActive) {
    setPrevActive(active);
    if (active) {
      setDisplayed("");
      setStatus("streaming");
    }
  }

  React.useEffect(() => {
    if (!active) return;
    stoppedRef.current = false;
    let i = 0;
    let cancelled = false;

    function tick() {
      if (cancelled || stoppedRef.current) return;
      // Uneven chunk sizes read closer to real token streaming than a fixed-width reveal.
      const chunk = 2 + Math.floor(Math.random() * 4);
      i = Math.min(fullText.length, i + chunk);
      setDisplayed(fullText.slice(0, i));
      if (i >= fullText.length) {
        setStatus("done");
        return;
      }
      window.setTimeout(tick, 18 + Math.random() * 30);
    }
    const start = window.setTimeout(tick, 120);

    return () => {
      cancelled = true;
      window.clearTimeout(start);
    };
  }, [fullText, active]);

  const stop = React.useCallback(() => {
    stoppedRef.current = true;
    setStatus("stopped");
  }, []);

  return { displayed, status, stop };
}

/**
 * Generation timing tiers (frontend plan §1.5): drives which loading affordance a
 * generation surface shows as elapsed time grows, from an instant cache hit up through
 * the 45s timeout state.
 */
export type GenerationTier = "instant" | "normal" | "slow" | "timeout";

export function useGenerationTiming(active: boolean, opts?: { simulatedLatencyMs?: number }) {
  const latency = opts?.simulatedLatencyMs ?? 1600;
  const [tier, setTier] = React.useState<GenerationTier>(latency < 300 ? "instant" : "normal");
  const [elapsedMs, setElapsedMs] = React.useState(0);
  const [ready, setReady] = React.useState(latency < 300);

  const [prevActive, setPrevActive] = React.useState(active);
  if (active !== prevActive) {
    setPrevActive(active);
    if (active) {
      setElapsedMs(0);
      setReady(latency < 300);
      setTier(latency < 300 ? "instant" : "normal");
    }
  }

  React.useEffect(() => {
    if (!active) return;
    // Date.now() is impure, so it's read here (an effect) rather than during render.
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setElapsedMs(elapsed);
      if (elapsed >= latency) {
        setReady(true);
        window.clearInterval(interval);
        return;
      }
      setTier(elapsed >= 8000 ? "slow" : elapsed >= 45000 ? "timeout" : "normal");
    }, 100);

    return () => window.clearInterval(interval);
  }, [active, latency]);

  return { tier, elapsedMs, ready };
}
