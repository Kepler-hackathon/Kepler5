"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, ChalkboardTeacher, CircleNotch } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { KeplerMark } from "@/components/nav/kepler-mark";
import { useToast } from "@/components/ui/toast";

type Role = "student" | "teacher";
const LAST_ROLE_KEY = "keplerlearn:last-role";

/**
 * Screen 0 (frontend plan Part III §3, S0). No sign-in (D4): choosing a role just sets
 * a local flag, so there's nothing to authenticate and no failure state to design for.
 */
export function RoleSelector() {
  const router = useRouter();
  const toast = useToast();
  const [lastRole, setLastRole] = React.useState<Role | null>(null);
  const [entering, setEntering] = React.useState<Role | null>(null);

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
    if (role === "teacher") {
      toast.push({ message: "Teacher screens aren't part of this preview yet." });
      return;
    }
    setEntering(role);
    window.localStorage.setItem(LAST_ROLE_KEY, role);
    window.setTimeout(() => router.push("/courses"), 400);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6">
      <KeplerMark className="size-10" />
      <h1 className="mt-4">KeplerLearn</h1>
      <p className="mt-2 text-[16px] text-muted font-body">Pick how you&rsquo;re joining today.</p>

      <div className="mt-10 grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
        {(
          [
            { role: "student" as const, label: "Student", desc: "Lectures, practice quizzes, and AI-grounded help.", Icon: GraduationCap },
            { role: "teacher" as const, label: "Teacher", desc: "Modules, analytics, and the review queue.", Icon: ChalkboardTeacher },
          ]
        ).map(({ role, label, desc, Icon }) => (
          <button
            key={role}
            onClick={() => choose(role)}
            disabled={entering !== null}
            className={cn(
              "flex flex-col items-start gap-3 rounded-[var(--radius-card)] border border-hairline bg-surface-card p-6 text-left transition-colors",
              "hover:border-body disabled:cursor-not-allowed disabled:opacity-60"
            )}
          >
            <div className="flex w-full items-center justify-between">
              <Icon className="size-7 text-accent-text" />
              {lastRole === role ? (
                <span className="text-[11px] font-medium font-body uppercase tracking-[0.5px] text-muted">
                  (last used)
                </span>
              ) : null}
            </div>
            <h3 className="text-[22px]">
              {label}
              {entering === role ? <CircleNotch className="ml-2 inline-block size-4 animate-spin align-middle" /> : null}
            </h3>
            <p className="text-[14px] text-muted font-body">{desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
