"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, ChalkboardTeacher, CircleNotch } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { KeplerMark } from "@/components/nav/kepler-mark";
import { getOrCreateUserId, setStoredRole, type Role } from "@/lib/identity";

const LAST_ROLE_KEY = "keplerlearn:last-role";

/**
 * Screen 0 (frontend plan Part III §3, S0). No sign-in (D4): choosing a role just sets
 * a local flag, so there's nothing to authenticate and no failure state to design for.
 */
export function RoleSelector() {
  const router = useRouter();
  const [lastRole, setLastRole] = React.useState<Role | null>(null);
  const [entering, setEntering] = React.useState<Role | null>(null);
  const [slowLoad, setSlowLoad] = React.useState(false);

  React.useEffect(() => {
    // localStorage doesn't exist during SSR, so this has to be a post-mount read (not
    // an "adjust state during render" case like elsewhere in this app) to avoid a
    // hydration mismatch — the lint rule can't tell those two cases apart.
    const stored = window.localStorage.getItem(LAST_ROLE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored === "student" || stored === "teacher") setLastRole(stored);
  }, []);

  function choose(role: Role) {
    if (entering) return;
    setEntering(role);
    getOrCreateUserId();
    setStoredRole(role);
    window.dispatchEvent(new CustomEvent("keplerlearn:role-change", { detail: role }));
    const slowTimer = window.setTimeout(() => setSlowLoad(true), 3000);
    window.setTimeout(() => {
      window.clearTimeout(slowTimer);
      router.push("/courses");
    }, 400);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6">
      <KeplerMark className="size-10" />
      <h1 className="mt-4">KeplerLearn</h1>
      <p className="mt-2 text-[16px] text-muted font-body">Select your experience for the hackathon walkthrough.</p>

      <div className="mt-10 w-full max-w-sm space-y-3">
        {/* Primary CTA — Student */}
        <button
          onClick={() => choose("student")}
          disabled={entering !== null}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-button-primary px-6 py-3 text-[15px] font-medium font-body text-on-primary transition-opacity",
            "hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          )}
        >
          <GraduationCap className="size-4" />
          Continue as Student
          {entering === "student" ? <CircleNotch className="ml-1 size-4 animate-spin" /> : null}
          {lastRole === "student" ? <span className="ml-1 text-[11px] opacity-70">(last used)</span> : null}
        </button>

        {/* Secondary CTA — Teacher */}
        <button
          onClick={() => choose("teacher")}
          disabled={entering !== null}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-[var(--radius-control)] border border-hairline bg-canvas px-6 py-3 text-[15px] font-medium font-body text-ink transition-colors",
            "hover:border-body disabled:cursor-not-allowed disabled:opacity-60"
          )}
        >
          <ChalkboardTeacher className="size-4" />
          Continue as Teacher
          {entering === "teacher" ? <CircleNotch className="ml-1 size-4 animate-spin" /> : null}
          {lastRole === "teacher" ? <span className="ml-1 text-[11px] text-muted">(last used)</span> : null}
        </button>

        {/* Demo Mode banner */}
        <div className="mt-4 rounded-[var(--radius-control)] border border-hairline bg-surface-card px-4 py-2.5 text-center text-[13px] font-body text-muted">
          Demo Mode — instant role switching available from the top bar at any time.
        </div>
      </div>

      {slowLoad ? (
        <p className="mt-6 animate-pulse text-[14px] text-muted font-body">
          Waking up the demo&hellip;
        </p>
      ) : null}
    </div>
  );
}
