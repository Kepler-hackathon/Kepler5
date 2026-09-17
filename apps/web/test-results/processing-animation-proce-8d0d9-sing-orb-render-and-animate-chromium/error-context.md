# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: processing-animation.spec.ts >> processing animation — orbital rings and pulsing orb render and animate
- Location: e2e/processing-animation.spec.ts:38:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Processing module…')
Expected: visible
Timeout: 12000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByText('Processing module…') with timeout 12000ms
  - waiting for getByText('Processing module…')

```

```yaml
- navigation:
  - link "KeplerLearn":
    - /url: /courses
  - 'link "ANIM101: Anim Test Course"':
    - /url: /courses
  - link "Modules":
    - /url: /course/a0000000-0000-4000-8000-000000000002
  - link "Review Queue":
    - /url: /course/a0000000-0000-4000-8000-000000000002/review
  - link "Analytics":
    - /url: /course/a0000000-0000-4000-8000-000000000002/analytics
  - link "Forum":
    - /url: /course/a0000000-0000-4000-8000-000000000002/forum
  - link "Course Details":
    - /url: /course/a0000000-0000-4000-8000-000000000002/settings
  - radiogroup "Role":
    - radio "Student"
    - radio "Teacher" [checked]
- main:
  - paragraph: Module Setup
  - heading "Anim Test Module" [level=1]
  - 'button "Stage 1: Details & Upload 1 Details & Upload" [disabled]':
    - 'img "Stage 1: Details & Upload"'
    - text: 1 Details & Upload
  - 'button "Stage 2: AI Content 2 AI Content" [disabled]':
    - 'img "Stage 2: AI Content"'
    - text: 2 AI Content
  - 'button "Stage 3: Processing 3 Processing" [disabled]':
    - 'img "Stage 3: Processing"'
    - text: 3 Processing
  - 'button "Stage 4: Review & Publish 4 Review & Publish" [disabled]':
    - 'img "Stage 4: Review & Publish"'
    - text: 4 Review & Publish
  - paragraph: Module has no lectures
- region "Notifications (F8)":
  - list
- alert
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | import postgres from "postgres";
  3   | 
  4   | // Fixed UUIDs so repeated runs are idempotent
  5   | const TEACHER_ID = "a0000000-0000-4000-8000-000000000001";
  6   | const COURSE_ID = "a0000000-0000-4000-8000-000000000002";
  7   | const MODULE_ID = "a0000000-0000-4000-8000-000000000003";
  8   | const DB_URL = "postgresql://postgres:postgres@localhost:5432/keplerlearn";
  9   | 
  10  | test.beforeAll(async () => {
  11  |   const sql = postgres(DB_URL, { max: 1 });
  12  |   await sql`
  13  |     INSERT INTO users (id, display_name, default_role)
  14  |     VALUES (${TEACHER_ID}, 'Anim Teacher', 'teacher')
  15  |     ON CONFLICT (id) DO NOTHING
  16  |   `;
  17  |   await sql`
  18  |     INSERT INTO courses (id, name, code, term)
  19  |     VALUES (${COURSE_ID}, 'Anim Test Course', 'ANIM101', 'Fall 2026')
  20  |     ON CONFLICT (id) DO NOTHING
  21  |   `;
  22  |   await sql`
  23  |     INSERT INTO modules (id, course_id, name, status, ai_opt_in, items_per_lecture, created_by, order_index)
  24  |     VALUES (${MODULE_ID}, ${COURSE_ID}, 'Anim Test Module', 'processing', true, 2, ${TEACHER_ID}, 1)
  25  |     ON CONFLICT (id) DO UPDATE SET status = 'processing'
  26  |   `;
  27  |   await sql.end();
  28  | });
  29  | 
  30  | test.afterAll(async () => {
  31  |   const sql = postgres(DB_URL, { max: 1 });
  32  |   await sql`DELETE FROM modules WHERE id = ${MODULE_ID}`;
  33  |   await sql`DELETE FROM courses WHERE id = ${COURSE_ID}`;
  34  |   await sql`DELETE FROM users WHERE id = ${TEACHER_ID}`;
  35  |   await sql.end();
  36  | });
  37  | 
  38  | test("processing animation — orbital rings and pulsing orb render and animate", async ({ page }) => {
  39  |   // Set teacher identity in localStorage before navigating
  40  |   await page.goto("/");
  41  |   await page.evaluate(
  42  |     ({ userId }) => {
  43  |       localStorage.setItem("keplerlearn:user-id", userId);
  44  |       localStorage.setItem("keplerlearn:last-role", "teacher");
  45  |     },
  46  |     { userId: TEACHER_ID },
  47  |   );
  48  | 
  49  |   // Navigate directly to wizard stage 3.
  50  |   // stage1.moduleId is initialised from the URL param (emptyStage1(moduleId)), so
  51  |   // Stage3Processing renders immediately at ?stage=3 without waiting for the async data load.
  52  |   await page.goto(`/course/${COURSE_ID}/module/${MODULE_ID}/wizard?stage=3`);
  53  | 
  54  |   // Debug screenshot in case the heading never appears
  55  |   await page.waitForTimeout(3000);
  56  |   await page.screenshot({ path: "test-results/wizard-debug.png" });
  57  | 
  58  |   // Stage 3 heading must be visible before checking animation elements
  59  |   const heading = page.getByText("Processing module…");
> 60  |   await expect(heading).toBeVisible({ timeout: 12000 });
      |                         ^ Error: expect(locator).toBeVisible() failed
  61  | 
  62  |   // ── Outer slow ring ──────────────────────────────────────────────────────
  63  |   // Select the outermost SVG (size-20 = 80px, wraps the whole spinner)
  64  |   const outerSvg = page.locator('svg.animate-spin').first();
  65  |   await expect(outerSvg).toBeVisible();
  66  | 
  67  |   // The outer ring should have the dim track circle
  68  |   const trackCircle = outerSvg.locator('circle[stroke-opacity="0.12"]');
  69  |   await expect(trackCircle).toBeAttached();
  70  | 
  71  |   // The arc path (the moving comet stroke)
  72  |   const arcPath = outerSvg.locator('path[stroke="#cc785c"]');
  73  |   await expect(arcPath).toBeAttached();
  74  | 
  75  |   // ── Inner fast ring ──────────────────────────────────────────────────────
  76  |   // There are two animate-spin SVGs; the second is the inner ring
  77  |   const innerSvg = page.locator('svg.animate-spin').nth(1);
  78  |   await expect(innerSvg).toBeVisible();
  79  | 
  80  |   // Inner ring should be properly centered — not clipped off-screen
  81  |   const innerBox = await innerSvg.boundingBox();
  82  |   expect(innerBox).not.toBeNull();
  83  |   // Inner ring (size-14 = 56px) should be visible with positive coordinates
  84  |   expect(innerBox!.width).toBeGreaterThan(20);
  85  |   expect(innerBox!.height).toBeGreaterThan(20);
  86  |   expect(innerBox!.x).toBeGreaterThan(0);
  87  |   expect(innerBox!.y).toBeGreaterThan(0);
  88  | 
  89  |   // Outer and inner rings should be roughly concentric (centers within 8px of each other)
  90  |   const outerBox = await outerSvg.boundingBox();
  91  |   expect(outerBox).not.toBeNull();
  92  |   const outerCenterX = outerBox!.x + outerBox!.width / 2;
  93  |   const outerCenterY = outerBox!.y + outerBox!.height / 2;
  94  |   const innerCenterX = innerBox!.x + innerBox!.width / 2;
  95  |   const innerCenterY = innerBox!.y + innerBox!.height / 2;
  96  |   expect(Math.abs(outerCenterX - innerCenterX)).toBeLessThan(8);
  97  |   expect(Math.abs(outerCenterY - innerCenterY)).toBeLessThan(8);
  98  | 
  99  |   // ── Center pulsing orb ───────────────────────────────────────────────────
  100 |   const pingRing = page.locator('.animate-ping');
  101 |   await expect(pingRing).toBeVisible();
  102 | 
  103 |   // Solid center dot (sibling of ping ring, inside the orb container)
  104 |   const solidDot = page.locator('.animate-ping + span');
  105 |   await expect(solidDot).toBeVisible();
  106 | 
  107 |   // ── Concentric centering: orb center should be close to ring centers ─────
  108 |   const pingBox = await pingRing.boundingBox();
  109 |   expect(pingBox).not.toBeNull();
  110 |   const pingCenterX = pingBox!.x + pingBox!.width / 2;
  111 |   const pingCenterY = pingBox!.y + pingBox!.height / 2;
  112 |   expect(Math.abs(pingCenterX - outerCenterX)).toBeLessThan(10);
  113 |   expect(Math.abs(pingCenterY - outerCenterY)).toBeLessThan(10);
  114 | 
  115 |   // Screenshot for manual inspection
  116 |   await page.screenshot({ path: "test-results/processing-animation.png", fullPage: false });
  117 | });
  118 | 
```