"use client";

import * as React from "react";

export type Role = "student" | "teacher";

const USER_ID_KEY = "keplerlearn:user-id";
const LAST_ROLE_KEY = "keplerlearn:last-role";

export function getStoredUserId(): string | null {
  try {
    return window.localStorage.getItem(USER_ID_KEY);
  } catch {
    return null;
  }
}

// D4 (docs/backend/backend-plan.md §11): identity is a client-minted demo user id,
// persisted once so it survives reloads within this browser.
export function getOrCreateUserId(): string {
  const existing = getStoredUserId();
  if (existing) return existing;
  const id = crypto.randomUUID();
  try {
    window.localStorage.setItem(USER_ID_KEY, id);
  } catch {
    // ignore — falls back to a fresh id next call
  }
  return id;
}

export function getStoredRole(): Role | null {
  try {
    const r = window.localStorage.getItem(LAST_ROLE_KEY);
    return r === "student" || r === "teacher" ? r : null;
  } catch {
    return null;
  }
}

export function setStoredRole(role: Role): void {
  try {
    window.localStorage.setItem(LAST_ROLE_KEY, role);
  } catch {
    // ignore
  }
}

export interface Identity {
  userId: string;
  role: Role;
}

const IdentityContext = React.createContext<Identity | null>(null);

export function IdentityProvider({ children }: { children: React.ReactNode }) {
  const [identity, setIdentity] = React.useState<Identity | null>(null);

  const sync = React.useCallback(() => {
    const role = getStoredRole();
    if (!role) {
      setIdentity(null);
      return;
    }
    const userId = getOrCreateUserId();
    setIdentity({ userId, role });
    // Registers/touches the users row (apps/web/src/app/api/me/route.ts) — fire and forget.
    fetch("/api/me", {
      method: "POST",
      headers: { "x-kepler-user": userId, "x-kepler-role": role },
    }).catch(() => {});
  }, []);

  React.useEffect(() => {
    sync();
    const onRoleChange = () => sync();
    window.addEventListener("keplerlearn:role-change", onRoleChange);
    window.addEventListener("storage", onRoleChange);
    return () => {
      window.removeEventListener("keplerlearn:role-change", onRoleChange);
      window.removeEventListener("storage", onRoleChange);
    };
  }, [sync]);

  return <IdentityContext.Provider value={identity}>{children}</IdentityContext.Provider>;
}

export function useIdentity(): Identity | null {
  return React.useContext(IdentityContext);
}
