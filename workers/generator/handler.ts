import type { Context, SQSEvent, SQSHandler } from 'aws-lambda';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { createAmazonBedrock } from '@ai-sdk/amazon-bedrock';
import { generateObject, generateText } from 'ai';
import postgres from 'postgres';
import { z } from 'zod';
import { uuidv7 } from 'uuidv7';

// ─── DB ──────────────────────────────────────────────────────────────────────

let _sql: postgres.Sql | undefined;

async function getSql(): Promise<postgres.Sql> {
  if (_sql) return _sql;
  if (process.env.DATABASE_URL) {
    _sql = postgres(process.env.DATABASE_URL, { max: 3 });
    return _sql;
  }
  const sm = new SecretsManagerClient({});
  const { SecretString } = await sm.send(
    new GetSecretValueCommand({ SecretId: process.env.DB_SECRET_ARN! }),
  );
  const { host, port, username, password } = JSON.parse(SecretString!);
  const url = `postgres://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}/${process.env.DB_NAME ?? 'kepler'}`;
  _sql = postgres(url, { max: 3, ssl: 'require' });
  return _sql;
}

// ─── Bedrock ─────────────────────────────────────────────────────────────────

function getBedrock() {
  return createAmazonBedrock({ region: process.env.AWS_REGION ?? 'us-east-1' });
}

function mainModel() {
  return getBedrock()(process.env.BEDROCK_MODEL_MAIN ?? 'us.anthropic.claude-sonnet-5');
}

function fastModel() {
  return getBedrock()(
    process.env.BEDROCK_MODEL_FAST ?? 'us.anthropic.claude-haiku-4-5-20251001-v1:0',
  );
}

function isThrottle(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  return (
    err.name.includes('ThrottlingException') ||
    err.message.includes('ThrottlingException') ||
    err.message.includes('Too many requests') ||
    err.message.includes('throttl')
  );
}

function rethrowAsThrottle(err: unknown): never {
  const e = err instanceof Error ? err : new Error(String(err));
  e.name = 'ThrottlingException';
  throw e;
}

// ─── Types ───────────────────────────────────────────────────────────────────

type SfnTask =
  | { task: 'startRun'; input: { runId: string; moduleId: string; onlyLectureIds?: string[] | null; force?: boolean } }
  | { task: 'wizardGenerate'; runId: string; moduleId: string; lectureId: string }
  | { task: 'finishRun'; input: Record<string, unknown> };

export type JobMessage = { jobId: string };

const JOB_TYPES = new Set([
  'remediation_widget',
  'remediation_text',
  'practice_quiz',
  'supplementary',
  'chat_title',
]);

// ─── startRun ────────────────────────────────────────────────────────────────

export async function startRun(input: {
  runId: string;
  moduleId: string;
  onlyLectureIds?: string[] | null;
  force?: boolean;
}): Promise<{ lectureIds: string[]; aiOptIn: boolean }> {
  const sql = await getSql();
  const { runId, moduleId, onlyLectureIds, force } = input;

  const [mod] = await sql<{ ai_opt_in: boolean }[]>`
    SELECT ai_opt_in FROM modules WHERE id = ${moduleId}
  `;
  if (!mod) throw new Error(`module ${moduleId} not found`);

  let lectures: { id: string; parse_status: string }[];
  if (onlyLectureIds && onlyLectureIds.length > 0) {
    lectures = await sql<{ id: string; parse_status: string }[]>`
      SELECT id, parse_status FROM lectures
      WHERE module_id = ${moduleId} AND id = ANY(${sql.array(onlyLectureIds)}::uuid[])
      ORDER BY order_index
    `;
  } else {
    lectures = await sql<{ id: string; parse_status: string }[]>`
      SELECT id, parse_status FROM lectures
      WHERE module_id = ${moduleId}
      ORDER BY order_index
    `;
  }

  await sql`
    INSERT INTO processing_runs (id, module_id, status)
    VALUES (${runId}, ${moduleId}, 'running')
    ON CONFLICT (id) DO NOTHING
  `;

  const toProcess = lectures.filter((l) => force || l.parse_status !== 'parsed');

  for (const lec of toProcess) {
    await sql`
      INSERT INTO lecture_processing (run_id, lecture_id, parse_status, gen_status)
      VALUES (${runId}, ${lec.id}, 'pending', 'pending')
      ON CONFLICT (run_id, lecture_id) DO NOTHING
    `;
  }

  console.log(
    JSON.stringify({ msg: 'startRun', runId, moduleId, lectureCount: toProcess.length, aiOptIn: mod.ai_opt_in }),
  );
  return { lectureIds: toProcess.map((l) => l.id), aiOptIn: mod.ai_opt_in };
}

// ─── finishRun ───────────────────────────────────────────────────────────────

export async function finishRun(input: Record<string, unknown>): Promise<{ ok: boolean }> {
  const sql = await getSql();
  const runId = input.runId as string | undefined;
  if (!runId) {
    console.warn('finishRun called without runId — skipping DB update');
    return { ok: true };
  }

  const rows = await sql<{ parse_status: string; gen_status: string }[]>`
    SELECT parse_status, gen_status FROM lecture_processing WHERE run_id = ${runId}
  `;

  const allDone =
    rows.length === 0 ||
    rows.every((r) => r.gen_status === 'done' || r.gen_status === 'skipped');
  const moduleStatus = allDone ? 'ready_to_review' : 'needs_attention';

  const [run] = await sql<{ module_id: string }[]>`
    UPDATE processing_runs
    SET status = 'done', finished_at = now()
    WHERE id = ${runId}
    RETURNING module_id
  `;

  if (run) {
    await sql`
      UPDATE modules SET status = ${moduleStatus} WHERE id = ${run.module_id}
    `;
  }

  console.log(JSON.stringify({ msg: 'finishRun', runId, moduleStatus }));
  return { ok: true };
}

// ─── wizardGenerate ──────────────────────────────────────────────────────────

const QuestionSchema = z.object({
  questions: z.array(
    z.object({
      promptMd: z.string(),
      options: z.array(z.object({ key: z.string(), text: z.string() })).min(2).max(4),
      correctKey: z.string(),
      explanationMd: z.string(),
      conceptLabel: z.string(),
      slideIndex: z.number().int(),
    }),
  ),
});

export async function wizardGenerate(event: {
  runId: string;
  moduleId: string;
  lectureId: string;
}): Promise<void> {
  const sql = await getSql();
  const { runId, lectureId } = event;

  await sql`
    UPDATE lecture_processing
    SET gen_status = 'running', gen_attempts = gen_attempts + 1
    WHERE run_id = ${runId} AND lecture_id = ${lectureId}
  `;

  const [run] = await sql<{ cancel_requested: boolean }[]>`
    SELECT cancel_requested FROM processing_runs WHERE id = ${runId}
  `;
  if (run?.cancel_requested) {
    await sql`
      UPDATE lecture_processing SET gen_status = 'skipped'
      WHERE run_id = ${runId} AND lecture_id = ${lectureId}
    `;
    return;
  }

  const slides = await sql<{ id: string; index: number; text: string; notes: string | null }[]>`
    SELECT id, index, text, notes
    FROM slides
    WHERE lecture_id = ${lectureId}
      AND deleted_at IS NULL
      AND NOT is_supplementary
    ORDER BY index
  `;

  if (slides.length === 0) {
    await sql`
      UPDATE lecture_processing SET gen_status = 'skipped'
      WHERE run_id = ${runId} AND lecture_id = ${lectureId}
    `;
    return;
  }

  if (process.env.AI_DISABLED === 'true') {
    await sql`
      UPDATE lecture_processing SET gen_status = 'skipped'
      WHERE run_id = ${runId} AND lecture_id = ${lectureId}
    `;
    console.log(JSON.stringify({ msg: 'wizardGenerate skipped — AI_DISABLED', lectureId }));
    return;
  }

  const slideText = slides
    .map((s) => `## Slide ${s.index}\n${s.text || '(no text)'}${s.notes ? `\n\nNotes: ${s.notes}` : ''}`)
    .join('\n\n---\n\n');

  const itemsPerLecture = 3;

  let result: z.infer<typeof QuestionSchema>;
  try {
    const { object } = await generateObject({
      model: mainModel(),
      schema: QuestionSchema,
      prompt: `You are generating quiz questions for a university lecture.

${slideText}

Generate exactly ${itemsPerLecture} multiple-choice questions that test student understanding of the key concepts above. For each question:
- Choose a specific slide it comes from (slideIndex)
- Write a clear question stem (promptMd, markdown ok)
- Provide 3-4 answer options with single-letter keys (A, B, C, D)
- Mark the correct key
- Write a brief explanation (1-2 sentences)
- Label the concept being tested (conceptLabel, short phrase)

Return exactly ${itemsPerLecture} questions.`,
    });
    result = object;
  } catch (err) {
    if (isThrottle(err)) {
      await sql`
        UPDATE lecture_processing SET gen_status = 'pending'
        WHERE run_id = ${runId} AND lecture_id = ${lectureId}
      `;
      rethrowAsThrottle(err);
    }
    await sql`
      UPDATE lecture_processing
      SET gen_status = 'failed', gen_error = ${String(err instanceof Error ? err.message : err)}
      WHERE run_id = ${runId} AND lecture_id = ${lectureId}
    `;
    throw err;
  }

  const slideById = new Map(slides.map((s) => [s.index, s]));
  let inserted = 0;

  for (const q of result.questions) {
    const sourceSlide = slideById.get(q.slideIndex) ?? slides[0]!;
    const itemId = uuidv7();
    const questionId = uuidv7();

    const optionsJson = JSON.stringify(q.options);
    const contentJson = JSON.stringify({
      promptMd: q.promptMd,
      options: q.options,
      correctKey: q.correctKey,
      explanationMd: q.explanationMd,
    });
    const citationsJson = JSON.stringify([{ ref: sourceSlide.id, label: `Slide ${sourceSlide.index}` }]);

    await sql`
      INSERT INTO generated_items (id, lecture_id, source_slide_id, type, status, content, concept_label, citations)
      VALUES (
        ${itemId}, ${lectureId}, ${sourceSlide.id}, 'quiz', 'pending',
        ${contentJson}::jsonb, ${q.conceptLabel}, ${citationsJson}::jsonb
      )
    `;

    await sql`
      INSERT INTO quiz_questions (
        id, origin, generated_item_id, lecture_id, source_slide_id,
        prompt_md, options, correct_key, explanation_md, concept_label
      ) VALUES (
        ${questionId}, 'wizard', ${itemId}, ${lectureId}, ${sourceSlide.id},
        ${q.promptMd}, ${optionsJson}::jsonb, ${q.correctKey},
        ${q.explanationMd ?? ''}, ${q.conceptLabel}
      )
    `;

    inserted++;
  }

  await sql`
    UPDATE lecture_processing
    SET gen_status = 'done', items_generated = ${inserted}
    WHERE run_id = ${runId} AND lecture_id = ${lectureId}
  `;

  console.log(JSON.stringify({ msg: 'wizardGenerate done', lectureId, inserted }));
}

// ─── Job handlers ────────────────────────────────────────────────────────────

async function loadJob(sql: postgres.Sql, jobId: string) {
  const [job] = await sql<{ id: string; type: string; status: string; input: unknown }[]>`
    SELECT id, type, status, input FROM generation_jobs WHERE id = ${jobId}
  `;
  if (!job) throw new Error(`job ${jobId} not found`);
  if (job.status !== 'queued') {
    console.warn(JSON.stringify({ msg: 'job not queued, skipping', jobId, status: job.status }));
    return null;
  }
  await sql`
    UPDATE generation_jobs SET status = 'running', started_at = now() WHERE id = ${jobId}
  `;
  return job;
}

async function handlePracticeQuiz(sql: postgres.Sql, jobId: string, input: unknown): Promise<void> {
  const { lectureIds, count = 10 } = input as { lectureIds: string[]; count?: number };

  const questions = await sql<{ id: string }[]>`
    SELECT id FROM quiz_questions
    WHERE lecture_id = ANY(${sql.array(lectureIds)}::uuid[])
    ORDER BY random()
    LIMIT ${count}
  `;

  if (questions.length === 0) {
    await sql`
      UPDATE generation_jobs
      SET status = 'failed', error = 'no questions available', finished_at = now()
      WHERE id = ${jobId}
    `;
    await sql`
      UPDATE practice_sessions SET status = 'failed' WHERE job_id = ${jobId}
    `;
    return;
  }

  const ids = questions.map((q) => q.id);
  await sql`
    UPDATE practice_sessions
    SET status = 'ready', question_ids = ${sql.array(ids)}::uuid[]
    WHERE job_id = ${jobId}
  `;
  await sql`
    UPDATE generation_jobs
    SET status = 'succeeded', output = ${JSON.stringify({ questionIds: ids })}::jsonb, finished_at = now()
    WHERE id = ${jobId}
  `;
}

async function handleChatTitle(sql: postgres.Sql, jobId: string, input: unknown): Promise<void> {
  if (process.env.AI_DISABLED === 'true') {
    await sql`UPDATE generation_jobs SET status = 'succeeded', finished_at = now() WHERE id = ${jobId}`;
    return;
  }

  const { threadId, firstUserMessage } = input as { threadId: string; firstUserMessage: string };

  let title: string;
  try {
    const { text } = await generateText({
      model: fastModel(),
      prompt: `Generate a short title (≤60 characters, no quotes) for a tutoring chat thread that starts with this message:\n\n"${firstUserMessage.slice(0, 500)}"`,
      maxTokens: 30,
    });
    title = text.trim().replace(/^["']|["']$/g, '').slice(0, 60);
  } catch {
    title = firstUserMessage.slice(0, 60);
  }

  await sql`UPDATE chat_threads SET title = ${title} WHERE id = ${threadId}`;
  await sql`
    UPDATE generation_jobs SET status = 'succeeded', finished_at = now() WHERE id = ${jobId}
  `;
}

async function handleRemediation(
  sql: postgres.Sql,
  jobId: string,
  type: 'remediation_text' | 'remediation_widget',
  input: unknown,
): Promise<void> {
  if (process.env.AI_DISABLED === 'true') {
    await sql`UPDATE generation_jobs SET status = 'succeeded', finished_at = now() WHERE id = ${jobId}`;
    return;
  }

  const { questionId, optionKey, variant = 1 } = input as {
    questionId: string;
    optionKey: string;
    variant?: number;
  };

  const [question] = await sql<{
    prompt_md: string;
    options: { key: string; text: string }[];
    correct_key: string;
    explanation_md: string;
    concept_label: string;
    source_slide_id: string | null;
    version: number;
  }[]>`
    SELECT prompt_md, options, correct_key, explanation_md, concept_label, source_slide_id, version
    FROM quiz_questions WHERE id = ${questionId}
  `;
  if (!question) throw new Error(`question ${questionId} not found`);

  let slideContext = '';
  if (question.source_slide_id) {
    const [slide] = await sql<{ text: string; notes: string | null }[]>`
      SELECT text, notes FROM slides WHERE id = ${question.source_slide_id}
    `;
    if (slide) {
      slideContext = `\n\nRelevant slide:\n${slide.text}${slide.notes ? `\n\nNotes: ${slide.notes}` : ''}`;
    }
  }

  const chosenOption = question.options.find((o) => o.key === optionKey);
  const correctOption = question.options.find((o) => o.key === question.correct_key);

  let content: unknown;
  const kind = type === 'remediation_text' ? 'text' : 'widget';

  if (type === 'remediation_text') {
    const { text } = await generateText({
      model: mainModel(),
      prompt: `A student answered a quiz question incorrectly. Explain why their answer was wrong and guide them to the correct answer.

Question: ${question.prompt_md}
Student chose: (${optionKey}) ${chosenOption?.text ?? optionKey}
Correct answer: (${question.correct_key}) ${correctOption?.text ?? question.correct_key}
Concept: ${question.concept_label}${slideContext}

Write 2-3 paragraphs of clear explanation in markdown. Do not just repeat the question. Help the student understand the underlying concept.`,
    });
    content = { markdown: text };
  } else {
    // Generate a PredictCheck widget
    const WidgetSchema = z.object({
      family: z.literal('predict_check'),
      kind: z.string(),
      title: z.string().max(120),
      explanationMd: z.string(),
      citations: z.array(z.object({ ref: z.string(), label: z.string() })).default([]),
      stages: z.array(
        z.object({
          promptMd: z.string(),
          options: z.array(z.object({ key: z.string(), text: z.string() })).min(2).max(4),
          correctKey: z.string(),
          revealMd: z.string(),
        }),
      ).min(1).max(3),
    });

    const { object } = await generateObject({
      model: mainModel(),
      schema: WidgetSchema,
      prompt: `Create a predict-and-check remediation widget for a student who got a quiz question wrong.

Question: ${question.prompt_md}
Concept: ${question.concept_label}${slideContext}

Create 1-2 guided stages that help the student build up to understanding the correct answer step by step. Each stage has a sub-question, 2-4 answer choices, and a reveal explanation.`,
    });
    content = object;
  }

  await sql`
    UPDATE remediation_cache
    SET status = 'ready', content = ${JSON.stringify(content)}::jsonb, updated_at = now()
    WHERE question_id = ${questionId}
      AND question_version = ${question.version}
      AND option_key = ${optionKey}
      AND kind = ${kind}
      AND variant = ${variant}
  `;
  await sql`
    UPDATE generation_jobs SET status = 'succeeded', finished_at = now() WHERE id = ${jobId}
  `;
}

export async function handleJob(message: JobMessage): Promise<void> {
  const sql = await getSql();
  const job = await loadJob(sql, message.jobId);
  if (!job) return;

  if (!JOB_TYPES.has(job.type)) throw new Error(`unknown job type: ${job.type}`);
  console.log(JSON.stringify({ msg: 'job received', jobId: message.jobId, type: job.type }));

  try {
    switch (job.type) {
      case 'practice_quiz':
        await handlePracticeQuiz(sql, message.jobId, job.input);
        break;
      case 'chat_title':
        await handleChatTitle(sql, message.jobId, job.input);
        break;
      case 'remediation_text':
      case 'remediation_widget':
        await handleRemediation(sql, message.jobId, job.type, job.input);
        break;
      case 'supplementary':
        await sql`
          UPDATE generation_jobs
          SET status = 'failed', error = 'not_implemented', finished_at = now()
          WHERE id = ${message.jobId}
        `;
        break;
    }
  } catch (err) {
    // Handlers above record their own expected failure modes; this catches anything
    // unexpected so the job never gets stuck at 'running' with no error recorded.
    await sql`
      UPDATE generation_jobs
      SET status = 'failed', error = ${String(err instanceof Error ? err.message : err)}, finished_at = now()
      WHERE id = ${message.jobId} AND status = 'running'
    `;
    throw err;
  }
}

// ─── Step Functions dispatch ──────────────────────────────────────────────────

async function handleSfnTask(event: SfnTask): Promise<unknown> {
  switch (event.task) {
    case 'startRun':
      return startRun(event.input);
    case 'wizardGenerate':
      return wizardGenerate(event);
    case 'finishRun':
      return finishRun(event.input);
    default:
      throw new Error(`unknown task: ${(event as { task?: string }).task}`);
  }
}

function isSqsEvent(event: unknown): event is SQSEvent {
  return typeof event === 'object' && event !== null && Array.isArray((event as SQSEvent).Records);
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export const handler = async (event: SQSEvent | SfnTask, _context: Context): Promise<unknown> => {
  if (isSqsEvent(event)) {
    for (const record of event.Records) {
      await handleJob(JSON.parse(record.body) as JobMessage);
    }
    return;
  }
  return handleSfnTask(event);
};

export type _SqsHandler = SQSHandler;
