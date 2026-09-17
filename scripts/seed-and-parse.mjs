/**
 * Seeds DB with a fresh course/module/lectures and triggers deck-parser
 * to rasterize slides → S3 images. Run from repo root:
 *   node scripts/seed-and-parse.mjs
 */
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import {
  S3Client,
  PutObjectCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ── Config ─────────────────────────────────────────────────────────────────
const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/keplerlearn";
const AWS_REGION = process.env.AWS_REGION || "us-east-1";
const UPLOADS_BUCKET = process.env.UPLOADS_BUCKET;
const ASSETS_BUCKET = process.env.ASSETS_BUCKET;

const TESTDATA = [
  {
    file: path.join(ROOT, "testdata/L01-intro.pdf"),
    title: "L01-intro",
    mime: "application/pdf",
  },
  {
    file: path.join(ROOT, "testdata/L02-java-review.pdf"),
    title: "L02-java-review",
    mime: "application/pdf",
  },
];

const DECK_PARSER_DIR = path.join(ROOT, "workers/deck-parser");
const PYTHON = path.join(DECK_PARSER_DIR, ".venv/bin/python3");

// ── Helpers ─────────────────────────────────────────────────────────────────
function uuidv7() {
  // Simple UUID v4 for seeding
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function runParser(event) {
  return new Promise((resolve, reject) => {
    const child = execFile(
      PYTHON,
      ["local_run.py"],
      { cwd: DECK_PARSER_DIR, env: process.env },
      (err, stdout, stderr) => {
        if (err) return reject(new Error(`parser failed: ${stderr || err.message}`));
        try {
          resolve(JSON.parse(stdout));
        } catch {
          reject(new Error(`non-JSON output: ${stdout}`));
        }
      }
    );
    child.stdin?.end(JSON.stringify(event));
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────
const pool = new pg.Pool({ connectionString: DATABASE_URL });
const s3 = new S3Client({ region: AWS_REGION });

async function main() {
  console.log("── Checking buckets ─────────────────────────────────────────");
  if (!UPLOADS_BUCKET || !ASSETS_BUCKET) {
    console.error("UPLOADS_BUCKET and ASSETS_BUCKET must be set in .env.local");
    process.exit(1);
  }
  for (const bucket of [UPLOADS_BUCKET, ASSETS_BUCKET]) {
    try {
      await s3.send(new HeadBucketCommand({ Bucket: bucket }));
      console.log(`  ✓ ${bucket}`);
    } catch (e) {
      console.error(`  ✗ ${bucket}: ${e.message}`);
      process.exit(1);
    }
  }

  console.log("\n── Creating course + module ─────────────────────────────────");
  const courseId = uuidv7();
  const moduleId = uuidv7();
  const userId = uuidv7();
  const runId = uuidv7();

  await pool.query(
    `INSERT INTO users (id, display_name, default_role, created_at, last_seen_at)
     VALUES ($1, 'Seed Teacher', 'teacher', NOW(), NOW()) ON CONFLICT DO NOTHING`,
    [userId]
  );
  await pool.query(
    `INSERT INTO courses (id, name, code, term, created_at)
     VALUES ($1, 'CS 2420 – Data Structures', 'CS2420', 'Fall 2026', NOW())`,
    [courseId]
  );
  await pool.query(
    `INSERT INTO modules (id, course_id, name, overview_md, order_index, status, ai_opt_in, items_per_lecture, created_by, created_at, updated_at)
     VALUES ($1, $2, 'Module 1 – Introduction & Java Review', 'Intro module', 1, 'published', true, 3, $3, NOW(), NOW())`,
    [moduleId, courseId, userId]
  );
  console.log(`  course  ${courseId}`);
  console.log(`  module  ${moduleId}`);

  console.log("\n── Inserting processing_run ─────────────────────────────────");
  await pool.query(
    `INSERT INTO processing_runs (id, module_id, status)
     VALUES ($1, $2, 'running')`,
    [runId, moduleId]
  );

  const lectureIds = [];

  for (let i = 0; i < TESTDATA.length; i++) {
    const { file, title, mime } = TESTDATA[i];
    if (!fs.existsSync(file)) {
      console.warn(`  skip: ${file} not found`);
      continue;
    }

    console.log(`\n── ${title} ──────────────────────────────────────────────`);
    const fileId = uuidv7();
    const lectureId = uuidv7();
    const s3Key = `uploads/${fileId}/${title}.pdf`;
    const fileSize = fs.statSync(file).size;

    // 1. Upload PDF to S3
    console.log(`  uploading to s3://${UPLOADS_BUCKET}/${s3Key}`);
    await s3.send(
      new PutObjectCommand({
        Bucket: UPLOADS_BUCKET,
        Key: s3Key,
        Body: fs.readFileSync(file),
        ContentType: mime,
      })
    );
    console.log(`  ✓ uploaded (${Math.round(fileSize / 1024)} KB)`);

    // 2. Insert file + lecture rows
    await pool.query(
      `INSERT INTO files (id, uploader_id, kind, bucket, key, original_name, mime, size_bytes, status, created_at)
       VALUES ($1, $2, 'deck', $3, $4, $5, $6, $7, 'uploaded', NOW())`,
      [fileId, userId, UPLOADS_BUCKET, s3Key, `${title}.pdf`, mime, fileSize]
    );
    await pool.query(
      `INSERT INTO lectures (id, module_id, title, order_index, deck_file_id, parse_status, bundle_version, created_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', 1, NOW())`,
      [lectureId, moduleId, title, i + 1, fileId]
    );
    await pool.query(
      `INSERT INTO lecture_processing (run_id, lecture_id, parse_status, gen_status, parse_attempts)
       VALUES ($1, $2, 'pending', 'pending', 0)`,
      [runId, lectureId]
    );
    lectureIds.push(lectureId);
    console.log(`  lecture ${lectureId}`);

    // 3. Run deck-parser
    console.log(`  parsing…`);
    try {
      const result = await runParser({
        task: "parse",
        runId,
        moduleId,
        lectureId,
      });
      console.log(`  ✓ parse result:`, JSON.stringify(result));
    } catch (err) {
      console.error(`  ✗ parse failed:`, err.message);
    }

    // 4. Check image keys written
    const rows = await pool.query(
      `SELECT index, image_key FROM slides WHERE lecture_id = $1 ORDER BY index LIMIT 5`,
      [lectureId]
    );
    const withImages = rows.rows.filter((r) => r.image_key);
    console.log(
      `  slides: ${rows.rows.length} total, ${withImages.length} with imageKey`
    );
    if (withImages.length > 0) {
      console.log(`  first image_key: ${withImages[0].image_key}`);
    }
  }

  console.log("\n── Done ─────────────────────────────────────────────────────");
  console.log(`  courseId: ${courseId}`);
  console.log(`  moduleId: ${moduleId}`);
  console.log(`  lectureIds: ${lectureIds.join(", ")}`);
  console.log(`\n  Browse: http://localhost:3000/course/${courseId}`);
  console.log(`  Lecture 1: http://localhost:3000/lecture/${lectureIds[0]}`);

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
