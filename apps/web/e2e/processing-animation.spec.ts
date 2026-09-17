import { test, expect } from "@playwright/test";
import postgres from "postgres";

// Fixed UUIDs so repeated runs are idempotent
const TEACHER_ID = "a0000000-0000-4000-8000-000000000001";
const COURSE_ID = "a0000000-0000-4000-8000-000000000002";
const MODULE_ID = "a0000000-0000-4000-8000-000000000003";
const DB_URL = "postgresql://postgres:postgres@localhost:5432/keplerlearn";

test.beforeAll(async () => {
  const sql = postgres(DB_URL, { max: 1 });
  await sql`
    INSERT INTO users (id, display_name, default_role)
    VALUES (${TEACHER_ID}, 'Anim Teacher', 'teacher')
    ON CONFLICT (id) DO NOTHING
  `;
  await sql`
    INSERT INTO courses (id, name, code, term)
    VALUES (${COURSE_ID}, 'Anim Test Course', 'ANIM101', 'Fall 2026')
    ON CONFLICT (id) DO NOTHING
  `;
  await sql`
    INSERT INTO modules (id, course_id, name, status, ai_opt_in, items_per_lecture, created_by, order_index)
    VALUES (${MODULE_ID}, ${COURSE_ID}, 'Anim Test Module', 'processing', true, 2, ${TEACHER_ID}, 1)
    ON CONFLICT (id) DO UPDATE SET status = 'processing'
  `;
  await sql.end();
});

test.afterAll(async () => {
  const sql = postgres(DB_URL, { max: 1 });
  await sql`DELETE FROM modules WHERE id = ${MODULE_ID}`;
  await sql`DELETE FROM courses WHERE id = ${COURSE_ID}`;
  await sql`DELETE FROM users WHERE id = ${TEACHER_ID}`;
  await sql.end();
});

test("processing animation — orbital rings and pulsing orb render and animate", async ({ page }) => {
  // Set teacher identity in localStorage before navigating
  await page.goto("/");
  await page.evaluate(
    ({ userId }) => {
      localStorage.setItem("keplerlearn:user-id", userId);
      localStorage.setItem("keplerlearn:last-role", "teacher");
    },
    { userId: TEACHER_ID },
  );

  // Navigate directly to wizard stage 3.
  // stage1.moduleId is initialised from the URL param (emptyStage1(moduleId)), so
  // Stage3Processing renders immediately at ?stage=3 without waiting for the async data load.
  await page.goto(`/course/${COURSE_ID}/module/${MODULE_ID}/wizard?stage=3`);

  // Debug screenshot in case the heading never appears
  await page.waitForTimeout(3000);
  await page.screenshot({ path: "test-results/wizard-debug.png" });

  // Stage 3 heading must be visible before checking animation elements
  const heading = page.getByText("Processing module…");
  await expect(heading).toBeVisible({ timeout: 12000 });

  // ── Outer slow ring ──────────────────────────────────────────────────────
  // Select the outermost SVG (size-20 = 80px, wraps the whole spinner)
  const outerSvg = page.locator('svg.animate-spin').first();
  await expect(outerSvg).toBeVisible();

  // The outer ring should have the dim track circle
  const trackCircle = outerSvg.locator('circle[stroke-opacity="0.12"]');
  await expect(trackCircle).toBeAttached();

  // The arc path (the moving comet stroke)
  const arcPath = outerSvg.locator('path[stroke="#cc785c"]');
  await expect(arcPath).toBeAttached();

  // ── Inner fast ring ──────────────────────────────────────────────────────
  // There are two animate-spin SVGs; the second is the inner ring
  const innerSvg = page.locator('svg.animate-spin').nth(1);
  await expect(innerSvg).toBeVisible();

  // Inner ring should be properly centered — not clipped off-screen
  const innerBox = await innerSvg.boundingBox();
  expect(innerBox).not.toBeNull();
  // Inner ring (size-14 = 56px) should be visible with positive coordinates
  expect(innerBox!.width).toBeGreaterThan(20);
  expect(innerBox!.height).toBeGreaterThan(20);
  expect(innerBox!.x).toBeGreaterThan(0);
  expect(innerBox!.y).toBeGreaterThan(0);

  // Outer and inner rings should be roughly concentric (centers within 8px of each other)
  const outerBox = await outerSvg.boundingBox();
  expect(outerBox).not.toBeNull();
  const outerCenterX = outerBox!.x + outerBox!.width / 2;
  const outerCenterY = outerBox!.y + outerBox!.height / 2;
  const innerCenterX = innerBox!.x + innerBox!.width / 2;
  const innerCenterY = innerBox!.y + innerBox!.height / 2;
  expect(Math.abs(outerCenterX - innerCenterX)).toBeLessThan(8);
  expect(Math.abs(outerCenterY - innerCenterY)).toBeLessThan(8);

  // ── Center pulsing orb ───────────────────────────────────────────────────
  const pingRing = page.locator('.animate-ping');
  await expect(pingRing).toBeVisible();

  // Solid center dot (sibling of ping ring, inside the orb container)
  const solidDot = page.locator('.animate-ping + span');
  await expect(solidDot).toBeVisible();

  // ── Concentric centering: orb center should be close to ring centers ─────
  const pingBox = await pingRing.boundingBox();
  expect(pingBox).not.toBeNull();
  const pingCenterX = pingBox!.x + pingBox!.width / 2;
  const pingCenterY = pingBox!.y + pingBox!.height / 2;
  expect(Math.abs(pingCenterX - outerCenterX)).toBeLessThan(10);
  expect(Math.abs(pingCenterY - outerCenterY)).toBeLessThan(10);

  // Screenshot for manual inspection
  await page.screenshot({ path: "test-results/processing-animation.png", fullPage: false });
});
