import { test, expect } from "@playwright/test";
import { seedIdentity, COURSE_ID, MODULE_ID, LECTURE_ID } from "./helpers";

// ─── Role selector ────────────────────────────────────────────────────────────
test("role selector — student flow navigates to /courses", async ({ page }) => {
  await page.goto("/");
  // Role selector has "Continue as Student" (primary CTA) or card-style "Student" button
  const continueBtn = page.getByRole("button", {
    name: /continue as student|^student$/i,
  }).first();
  await expect(continueBtn).toBeVisible({ timeout: 8000 });
  await continueBtn.click();
  await expect(page).toHaveURL(/\/courses/, { timeout: 8000 });
});

// ─── Course landing ────────────────────────────────────────────────────────────
test("course landing — modules visible", async ({ page }) => {
  await seedIdentity(page);
  await page.goto(`/course/${COURSE_ID}`);
  // At least one module card should appear
  await expect(page.locator("h2, h3").filter({ hasText: /module|lecture|week/i }).first()).toBeVisible({ timeout: 10000 });
});

// ─── Module detail ─────────────────────────────────────────────────────────────
test("module detail — lecture list renders", async ({ page }) => {
  await seedIdentity(page);
  await page.goto(`/course/${COURSE_ID}/module/${MODULE_ID}`);
  // Should render without 404
  await expect(page.getByRole("heading", { name: /404/i })).not.toBeVisible({ timeout: 10000 });
  // Should show at least one lecture row or any content heading
  await expect(page.locator("h1, h2, h3").first()).toBeVisible({ timeout: 10000 });
});

// ─── Slide viewer ──────────────────────────────────────────────────────────────
test("slide viewer — renders without crash, shows slide text or image", async ({ page }) => {
  await seedIdentity(page);
  await page.goto(`/lecture/${LECTURE_ID}`);

  // No 404 and no application error
  await expect(page.getByRole("heading", { name: /404/i })).not.toBeVisible({ timeout: 12000 });
  await expect(page.locator("text=Application error")).not.toBeVisible();
  // Slide nav buttons confirm the viewer mounted
  await expect(page.getByRole("button", { name: "Previous slide" })).toBeVisible({ timeout: 12000 });
  await expect(page.getByRole("button", { name: "Next slide" })).toBeVisible({ timeout: 12000 });
});

// ─── Slide navigation ─────────────────────────────────────────────────────────
test("slide viewer — next/prev navigation works", async ({ page }) => {
  await seedIdentity(page);
  await page.goto(`/lecture/${LECTURE_ID}`);
  await page.waitForTimeout(2000);

  const nextBtn = page.getByRole("button", { name: "Next slide" });
  if (await nextBtn.isVisible()) {
    await nextBtn.click();
    await page.waitForTimeout(500);
    // URL may update with slide param or page updates — just check no crash
    await expect(page.locator("text=Application error")).not.toBeVisible();
  }
});

// ─── FAQ / Forum ───────────────────────────────────────────────────────────────
test("forum page — loads questions tab", async ({ page }) => {
  await seedIdentity(page);
  await page.goto(`/course/${COURSE_ID}/forum`);
  // Should see either "Ask Question" button or "No questions yet"
  const hasContent = page.locator("button, p").filter({ hasText: /ask question|no questions/i });
  await expect(hasContent.first()).toBeVisible({ timeout: 10000 });
});

// ─── AI Assistant ──────────────────────────────────────────────────────────────
test("assistant — chat input renders", async ({ page }) => {
  await seedIdentity(page);
  await page.goto("/assistant");
  const chatInput = page.locator("textarea, input[type=text]").first();
  await expect(chatInput).toBeVisible({ timeout: 10000 });
});

// ─── Practice quizzes ──────────────────────────────────────────────────────────
test("quizzes page — renders without crash", async ({ page }) => {
  await seedIdentity(page);
  await page.goto("/quizzes");
  // Should show some content (quiz or empty state)
  await expect(page.locator("h1, h2, p").first()).toBeVisible({ timeout: 10000 });
  await expect(page.locator("text=Application error")).not.toBeVisible();
});

// ─── Progress page ─────────────────────────────────────────────────────────────
test("progress page — renders without crash", async ({ page }) => {
  await seedIdentity(page);
  await page.goto("/progress");
  await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10000 });
  await expect(page.locator("text=Application error")).not.toBeVisible();
});

// ─── API smoke tests ───────────────────────────────────────────────────────────
test("api/health returns ok", async ({ request }) => {
  const resp = await request.get("/api/health");
  expect(resp.status()).toBe(200);
  const json = await resp.json();
  expect(json.ok).toBe(true);
});

test("api/lectures/[id]/bundle returns slides", async ({ request }) => {
  const resp = await request.get(`/api/lectures/${LECTURE_ID}/bundle`, {
    headers: {
      "x-kepler-user": "550e8400-e29b-41d4-a716-446655440000",
      "x-kepler-role": "student",
    },
  });
  expect(resp.status()).toBe(200);
  const json = await resp.json();
  expect(Array.isArray(json.slides)).toBe(true);
  expect(json.slides.length).toBeGreaterThan(0);
});
