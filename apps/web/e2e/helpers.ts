import type { Page } from "@playwright/test";

const DEMO_USER = "550e8400-e29b-41d4-a716-446655440000";
// CS 2420 (data structures) — real DB course with uploaded lectures
export const COURSE_ID = "01a0aecd-b614-75fe-bde5-8d0334038d5d";
export const MODULE_ID = "01a0aecd-f9b4-72a8-8f5f-f8a858343843";
export const LECTURE_ID = "01a0aecd-f9eb-7962-befe-5a9825c4a7c9";

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
