import type { Page } from "@playwright/test";

const DEMO_USER = "550e8400-e29b-41d4-a716-446655440000";
// Fresh seed — created by scripts/seed-and-parse.mjs after DB wipe
export const COURSE_ID = "60e0d45e-f599-4ced-911e-f81f8caa59e4";
export const MODULE_ID = "90e327e5-e8ce-4443-834d-146f03195a46";
export const LECTURE_ID = "a54fe713-9c31-47b0-bdb8-651e9ad5019e"; // L01-intro (44 slides, all with imageKey)

/** Seed localStorage so API calls have identity headers without going through role selector. */
export async function seedIdentity(page: Page, role: "student" | "teacher" = "student") {
  await page.goto("/");
  await page.evaluate(
    ({ userId, role }) => {
      localStorage.setItem("keplerlearn:user-id", userId);
      localStorage.setItem("keplerlearn:last-role", role);
    },
    { userId: DEMO_USER, role },
  );
}
