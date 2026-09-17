import { apiJson, ApiError } from "@/lib/api-client";

/** The presign -> S3 PUT -> complete round trip, generalized from module-detail/upload-panel.tsx
 * so both the deck dropzone and the knowledge-anchor dropzone can share it. */
export async function uploadFile(
  file: File,
  kind: "deck" | "textbook" | "problem_bank",
  moduleId: string | null
): Promise<{ fileId: string }> {
  const { fileId, uploadUrl } = await apiJson<{ fileId: string; uploadUrl: string }>("/api/uploads", {
    method: "POST",
    body: JSON.stringify({ kind, mime: file.type, name: file.name, size: file.size }),
  });

  const putRes = await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
  if (!putRes.ok) throw new Error(`S3 upload failed (${putRes.status})`);

  await apiJson(`/api/uploads/${fileId}/complete`, {
    method: "POST",
    body: JSON.stringify(moduleId ? { moduleId } : {}),
  });

  return { fileId };
}

export function uploadErrorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Upload failed";
}

/** Runs `task` over `items` with at most `limit` in flight at once — used to fan out bulk deck
 * uploads without a batch endpoint (none exists; POST /api/uploads is single-file only). */
export async function withConcurrency<T>(items: T[], limit: number, task: (item: T) => Promise<void>): Promise<void> {
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const item = items[cursor++];
      await task(item);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}
