import { getOrCreateUserId, getStoredRole } from "./identity";

// Mirrors apps/web/src/lib/errors.ts's apiError() response shape.
export class ApiError extends Error {
  code: string;
  status: number;
  retryable: boolean;
  details?: unknown;

  constructor(code: string, message: string, status: number, retryable = false, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.retryable = retryable;
    this.details = details;
  }
}

function identityHeaders(): Record<string, string> {
  const role = getStoredRole();
  if (!role) return {};
  return { "x-kepler-user": getOrCreateUserId(), "x-kepler-role": role };
}

/** The single place every component should call through instead of raw fetch(). */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  for (const [k, v] of Object.entries(identityHeaders())) headers.set(k, v);
  if (init.body != null && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(path, { ...init, headers });
  if (!res.ok) {
    let code = "unknown_error";
    let message = res.statusText;
    let retryable = false;
    let details: unknown;
    try {
      const body = (await res.json()) as { error?: { code: string; message: string; retryable?: boolean; details?: unknown } };
      if (body.error) {
        code = body.error.code;
        message = body.error.message;
        retryable = body.error.retryable ?? false;
        details = body.error.details;
      }
    } catch {
      // non-JSON error body — fall back to statusText above
    }
    throw new ApiError(code, message, res.status, retryable, details);
  }
  return res;
}

export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, init);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
