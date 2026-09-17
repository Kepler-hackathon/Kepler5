import {
  pgTable, uuid, text, integer, boolean, timestamp, jsonb, bigint,
  index, uniqueIndex, primaryKey, check, type AnyPgColumn,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'
import {
  roleEnum, moduleStatusEnum, parseStatusEnum, genStatusEnum, fileKindEnum,
  uploadStatusEnum, itemTypeEnum, itemStatusEnum, lectureItemKindEnum,
  sessionStatusEnum, cacheStatusEnum, remediationKindEnum, peerStatusEnum,
  faqClassEnum, tagLevelEnum, chatScopeEnum, msgStatusEnum, jobTypeEnum,
  jobStatusEnum, eventTypeEnum,
} from './enums'
import { vector, tsvectorType } from './types'

const id = () => uuid('id').primaryKey().$defaultFn(() => uuidv7())
const now = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
const updatedAt = () => timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()

// ─── Identity ────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: id(),
  displayName: text('display_name').notNull(),
  defaultRole: roleEnum('default_role').notNull().default('student'),
  createdAt: now(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
})

export const courses = pgTable('courses', {
  id: id(),
  name: text('name').notNull(),
  code: text('code'),
  term: text('term'),
  instructorName: text('instructor_name'),
  description: text('description'),
  syllabusUrl: text('syllabus_url'),
  textbookTitle: text('textbook_title'),
  textbookAuthor: text('textbook_author'),
  textbookIsbn: text('textbook_isbn'),
  textbookUrl: text('textbook_url'),
  officeHours: text('office_hours'),
  homeworkPolicy: text('homework_policy'),
  gradingPolicy: text('grading_policy'),
  prerequisites: text('prerequisites'),
  contactEmail: text('contact_email'),
  createdAt: now(),
})

export const files = pgTable('files', {
  id: id(),
  uploaderId: uuid('uploader_id').references(() => users.id),
  kind: fileKindEnum('kind').notNull(),
  bucket: text('bucket').notNull(),
  key: text('key').notNull(),
  originalName: text('original_name').notNull(),
  mime: text('mime').notNull(),
  sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
  sha256: text('sha256'),
  status: uploadStatusEnum('status').notNull().default('pending'),
  rejectReason: text('reject_reason'),
  createdAt: now(),
}, (t) => [
  index('files_sha').on(t.sha256).where(sql`${t.sha256} is not null`),
])

// ─── Course content ───────────────────────────────────────────────────────────

export const modules = pgTable('modules', {
  id: id(),
  courseId: uuid('course_id').notNull().references(() => courses.id),
  name: text('name').notNull(),
  overviewMd: text('overview_md'),
  objectives: jsonb('objectives').notNull().default(sql`'[]'::jsonb`),
  scheduleNotes: text('schedule_notes'),
  orderIndex: integer('order_index'),
  status: moduleStatusEnum('status').notNull().default('draft'),
  aiOptIn: boolean('ai_opt_in').notNull().default(false),
  itemsPerLecture: integer('items_per_lecture').notNull().default(3),
  createdBy: uuid('created_by').references(() => users.id),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: now(),
  updatedAt: updatedAt(),
}, (t) => [
  check('modules_items_per_lecture_check', sql`${t.itemsPerLecture} between 1 and 5`),
])

export const lectures = pgTable('lectures', {
  id: id(),
  moduleId: uuid('module_id').notNull().references(() => modules.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  orderIndex: integer('order_index').notNull(),
  deckFileId: uuid('deck_file_id').references(() => files.id),
  parseStatus: parseStatusEnum('parse_status').notNull().default('pending'),
  parseError: text('parse_error'),
  slideCount: integer('slide_count'),
  estimatedMinutes: integer('estimated_minutes'),
  mediaLost: boolean('media_lost').notNull().default(false),
  bundleVersion: integer('bundle_version').notNull().default(1),
  notesMd: text('notes_md'),
  createdAt: now(),
})

export const slides = pgTable('slides', {
  id: id(),
  lectureId: uuid('lecture_id').notNull().references(() => lectures.id, { onDelete: 'cascade' }),
  index: integer('index'),
  afterSlideId: uuid('after_slide_id').references((): AnyPgColumn => slides.id),
  subIndex: integer('sub_index'),
  isSupplementary: boolean('is_supplementary').notNull().default(false),
  imageKey: text('image_key'),
  thumbKey: text('thumb_key'),
  width: integer('width'),
  height: integer('height'),
  text: text('text').notNull().default(''),
  textSource: text('text_source').notNull().default('none'),
  notes: text('notes'),
  content: jsonb('content'),
  sourceJobId: uuid('source_job_id'),
  createdAt: now(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => [
  check('slides_check', sql`
    (${t.isSupplementary} and ${t.afterSlideId} is not null and ${t.subIndex} is not null and ${t.index} is null)
    or (not ${t.isSupplementary} and ${t.index} is not null)
  `),
  uniqueIndex('slides_orig').on(t.lectureId, t.index).where(sql`not ${t.isSupplementary} and ${t.deletedAt} is null`),
  uniqueIndex('slides_supp').on(t.afterSlideId, t.subIndex).where(sql`${t.isSupplementary} and ${t.deletedAt} is null`),
])

export const knowledgeAnchors = pgTable('knowledge_anchors', {
  id: id(),
  moduleId: uuid('module_id').notNull().references(() => modules.id, { onDelete: 'cascade' }),
  fileId: uuid('file_id').notNull().references(() => files.id),
  kind: fileKindEnum('kind').notNull(),
  ingestStatus: genStatusEnum('ingest_status').notNull().default('pending'),
  pageCount: integer('page_count'),
  chunkCount: integer('chunk_count'),
  toc: jsonb('toc'),
  error: text('error'),
  createdAt: now(),
}, (t) => [
  check('knowledge_anchors_kind_check', sql`${t.kind} in ('textbook', 'problem_bank')`),
])

export const kbChunks = pgTable('kb_chunks', {
  id: id(),
  anchorId: uuid('anchor_id').notNull().references(() => knowledgeAnchors.id, { onDelete: 'cascade' }),
  moduleId: uuid('module_id').notNull(),
  pageFrom: integer('page_from').notNull(),
  pageTo: integer('page_to').notNull(),
  sectionLabel: text('section_label'),
  text: text('text').notNull(),
  tokenCount: integer('token_count').notNull(),
  embedding: vector('embedding', 1024).notNull(),
}, (t) => [
  index('kb_chunks_module').on(t.moduleId),
  // HNSW index created in a separate migration: CREATE INDEX kb_chunks_hnsw ON kb_chunks USING hnsw (embedding vector_cosine_ops)
])

// ─── Processing ───────────────────────────────────────────────────────────────

export const processingRuns = pgTable('processing_runs', {
  id: id(),
  moduleId: uuid('module_id').notNull().references(() => modules.id, { onDelete: 'cascade' }),
  executionArn: text('execution_arn'),
  status: genStatusEnum('status').notNull().default('pending'),
  cancelRequested: boolean('cancel_requested').notNull().default(false),
  onlyLectureIds: uuid('only_lecture_ids').array(),
  startedAt: now(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  error: text('error'),
})

export const lectureProcessing = pgTable('lecture_processing', {
  runId: uuid('run_id').notNull().references(() => processingRuns.id, { onDelete: 'cascade' }),
  lectureId: uuid('lecture_id').notNull().references(() => lectures.id, { onDelete: 'cascade' }),
  parseStatus: genStatusEnum('parse_status').notNull().default('pending'),
  parseError: text('parse_error'),
  parseAttempts: integer('parse_attempts').notNull().default(0),
  genStatus: genStatusEnum('gen_status').notNull().default('pending'),
  genError: text('gen_error'),
  genAttempts: integer('gen_attempts').notNull().default(0),
  itemsGenerated: integer('items_generated').notNull().default(0),
  updatedAt: updatedAt(),
}, (t) => [
  primaryKey({ columns: [t.runId, t.lectureId] }),
])

// ─── Generated items ──────────────────────────────────────────────────────────

export const generatedItems = pgTable('generated_items', {
  id: id(),
  lectureId: uuid('lecture_id').notNull().references(() => lectures.id, { onDelete: 'cascade' }),
  sourceSlideId: uuid('source_slide_id').references(() => slides.id),
  type: itemTypeEnum('type').notNull(),
  status: itemStatusEnum('status').notNull().default('approved'),
  content: jsonb('content').notNull(),
  conceptLabel: text('concept_label'),
  citations: jsonb('citations').notNull().default(sql`'[]'::jsonb`),
  modelMeta: jsonb('model_meta'),
  createdAt: now(),
})

export const quizQuestions = pgTable('quiz_questions', {
  id: id(),
  origin: text('origin').notNull(),
  generatedItemId: uuid('generated_item_id').references(() => generatedItems.id),
  lectureId: uuid('lecture_id').notNull().references(() => lectures.id, { onDelete: 'cascade' }),
  sourceSlideId: uuid('source_slide_id').references(() => slides.id),
  promptMd: text('prompt_md').notNull(),
  options: jsonb('options').notNull(),
  correctKey: text('correct_key').notNull(),
  explanationMd: text('explanation_md'),
  conceptLabel: text('concept_label').notNull(),
  version: integer('version').notNull().default(1),
  createdAt: now(),
})

export const lectureItems = pgTable('lecture_items', {
  id: id(),
  lectureId: uuid('lecture_id').notNull().references(() => lectures.id, { onDelete: 'cascade' }),
  afterSlideId: uuid('after_slide_id').notNull().references(() => slides.id),
  kind: lectureItemKindEnum('kind').notNull(),
  refId: uuid('ref_id').notNull(),
  orderInSlot: integer('order_in_slot').notNull().default(0),
  status: text('status').notNull().default('active'),
  addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('lecture_items_lecture').on(t.lectureId).where(sql`${t.status} = 'active'`),
])

// ─── Practice ─────────────────────────────────────────────────────────────────

export const practiceSessions = pgTable('practice_sessions', {
  id: id(),
  userId: uuid('user_id').notNull().references(() => users.id),
  selection: jsonb('selection').notNull(),
  status: sessionStatusEnum('status').notNull().default('generating'),
  jobId: uuid('job_id'),
  questionIds: uuid('question_ids').array().notNull().default(sql`'{}'::uuid[]`),
  currentIndex: integer('current_index').notNull().default(0),
  scoreCorrect: integer('score_correct'),
  scoreTotal: integer('score_total'),
  createdAt: now(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (t) => [
  index('practice_sessions_user').on(t.userId, t.createdAt),
])

export const practiceAnswers = pgTable('practice_answers', {
  sessionId: uuid('session_id').notNull().references(() => practiceSessions.id, { onDelete: 'cascade' }),
  questionId: uuid('question_id').notNull().references(() => quizQuestions.id),
  selectedKey: text('selected_key'),
  isCorrect: boolean('is_correct'),
  skipped: boolean('skipped').notNull().default(false),
  answeredAt: timestamp('answered_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.sessionId, t.questionId] }),
])

export const remediationCache = pgTable('remediation_cache', {
  questionId: uuid('question_id').notNull().references(() => quizQuestions.id, { onDelete: 'cascade' }),
  questionVersion: integer('question_version').notNull(),
  optionKey: text('option_key').notNull(),
  kind: remediationKindEnum('kind').notNull(),
  variant: integer('variant').notNull().default(1),
  status: cacheStatusEnum('status').notNull().default('generating'),
  content: jsonb('content'),
  citations: jsonb('citations').notNull().default(sql`'[]'::jsonb`),
  jobId: uuid('job_id'),
  error: text('error'),
  helpful: integer('helpful').notNull().default(0),
  notHelpful: integer('not_helpful').notNull().default(0),
  createdAt: now(),
  updatedAt: updatedAt(),
}, (t) => [
  primaryKey({ columns: [t.questionId, t.questionVersion, t.optionKey, t.kind, t.variant] }),
])

export const remediationFeedback = pgTable('remediation_feedback', {
  userId: uuid('user_id').notNull().references(() => users.id),
  questionId: uuid('question_id').notNull(),
  questionVersion: integer('question_version').notNull(),
  optionKey: text('option_key').notNull(),
  kind: remediationKindEnum('kind').notNull(),
  variant: integer('variant').notNull(),
  helpful: boolean('helpful').notNull(),
  note: text('note'),
  createdAt: now(),
}, (t) => [
  primaryKey({ columns: [t.userId, t.questionId, t.questionVersion, t.optionKey, t.kind, t.variant] }),
])

// ─── Peer widgets ─────────────────────────────────────────────────────────────

export const peerWidgets = pgTable('peer_widgets', {
  id: id(),
  authorId: uuid('author_id').notNull().references(() => users.id),
  questionId: uuid('question_id'),
  questionVersion: integer('question_version'),
  optionKey: text('option_key'),
  variant: integer('variant'),
  content: jsonb('content').notNull(),
  title: text('title').notNull(),
  note: text('note'),
  citations: jsonb('citations').notNull().default(sql`'[]'::jsonb`),
  tagModuleId: uuid('tag_module_id').notNull().references(() => modules.id),
  tagLectureId: uuid('tag_lecture_id').references(() => lectures.id),
  tagSlideId: uuid('tag_slide_id').references(() => slides.id),
  tagLevel: tagLevelEnum('tag_level').notNull(),
  status: peerStatusEnum('status').notNull().default('collecting'),
  upvoteCount: integer('upvote_count').notNull().default(0),
  enteredReviewAt: timestamp('entered_review_at', { withTimezone: true }),
  teacherNote: text('teacher_note'),
  archiveReason: text('archive_reason'),
  version: integer('version').notNull().default(1),
  lectureItemId: uuid('lecture_item_id').references(() => lectureItems.id),
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  createdAt: now(),
}, (t) => [
  check('peer_widgets_title_check', sql`char_length(${t.title}) <= 80`),
  check('peer_widgets_note_check', sql`${t.note} is null or char_length(${t.note}) <= 280`),
  uniqueIndex('peer_widgets_source')
    .on(t.questionId, t.questionVersion, t.optionKey, t.variant)
    .where(sql`${t.status} <> 'archived' and ${t.questionId} is not null`),
  index('peer_widgets_status').on(t.status, t.enteredReviewAt),
])

export const peerWidgetUpvotes = pgTable('peer_widget_upvotes', {
  widgetId: uuid('widget_id').notNull().references(() => peerWidgets.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id),
  createdAt: now(),
}, (t) => [
  primaryKey({ columns: [t.widgetId, t.userId] }),
])

// ─── FAQ ──────────────────────────────────────────────────────────────────────

export const faqThreads = pgTable('faq_threads', {
  id: id(),
  authorId: uuid('author_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  bodyMd: text('body_md').notNull(),
  tagModuleId: uuid('tag_module_id').notNull().references(() => modules.id),
  tagLectureId: uuid('tag_lecture_id').references(() => lectures.id),
  tagSlideId: uuid('tag_slide_id').references(() => slides.id),
  tagLevel: tagLevelEnum('tag_level').notNull(),
  classification: faqClassEnum('classification').notNull().default('question'),
  classificationMeta: jsonb('classification_meta'),
  endorsed: boolean('endorsed').notNull().default(false),
  endorsedBy: uuid('endorsed_by'),
  endorsedAt: timestamp('endorsed_at', { withTimezone: true }),
  replyCount: integer('reply_count').notNull().default(0),
  upvoteCount: integer('upvote_count').notNull().default(0),
  // Generated tsvector column — added via raw SQL migration (see migrations/)
  search: tsvectorType('search'),
  createdAt: now(),
  updatedAt: updatedAt(),
}, (t) => [
  check('faq_threads_title_check', sql`char_length(${t.title}) <= 150`),
  index('faq_threads_search').using('gin', t.search),
  index('faq_threads_tag').on(t.tagModuleId, t.tagLectureId, t.tagSlideId, t.createdAt),
])

export const faqReplies = pgTable('faq_replies', {
  id: id(),
  threadId: uuid('thread_id').notNull().references(() => faqThreads.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id').notNull().references(() => users.id),
  bodyMd: text('body_md').notNull(),
  isInstructor: boolean('is_instructor').notNull().default(false),
  createdAt: now(),
})

export const faqUpvotes = pgTable('faq_upvotes', {
  threadId: uuid('thread_id').notNull().references(() => faqThreads.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id),
}, (t) => [
  primaryKey({ columns: [t.threadId, t.userId] }),
])

// ─── Chat ─────────────────────────────────────────────────────────────────────

export const chatThreads = pgTable('chat_threads', {
  id: id(),
  userId: uuid('user_id').notNull().references(() => users.id),
  title: text('title'),
  scope: chatScopeEnum('scope').notNull().default('course'),
  scopeId: uuid('scope_id'),
  origin: text('origin'),
  pendingToolCallId: text('pending_tool_call_id'),
  createdAt: now(),
  lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
}, (t) => [
  index('chat_threads_user').on(t.userId, t.lastMessageAt),
])

export const chatMessages = pgTable('chat_messages', {
  id: id(),
  threadId: uuid('thread_id').notNull().references(() => chatThreads.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  parts: jsonb('parts').notNull(),
  scope: chatScopeEnum('scope'),
  scopeId: uuid('scope_id'),
  status: msgStatusEnum('status').notNull().default('complete'),
  usage: jsonb('usage'),
  createdAt: now(),
})

// ─── Progress & analytics ─────────────────────────────────────────────────────

export const studentProgress = pgTable('student_progress', {
  userId: uuid('user_id').notNull().references(() => users.id),
  lectureId: uuid('lecture_id').notNull().references(() => lectures.id, { onDelete: 'cascade' }),
  lastSlideId: uuid('last_slide_id').references(() => slides.id),
  maxSlideIndex: integer('max_slide_index').notNull().default(0),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  updatedAt: updatedAt(),
}, (t) => [
  primaryKey({ columns: [t.userId, t.lectureId] }),
])

export const learningEvents = pgTable('learning_events', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  userId: uuid('user_id').notNull(),
  type: eventTypeEnum('type').notNull(),
  lectureId: uuid('lecture_id'),
  slideId: uuid('slide_id'),
  questionId: uuid('question_id'),
  optionKey: text('option_key'),
  isCorrect: boolean('is_correct'),
  sessionId: uuid('session_id'),
  meta: jsonb('meta'),
  createdAt: now(),
}, (t) => [
  index('learning_events_lecture').on(t.lectureId, t.createdAt),
  index('learning_events_slide').on(t.slideId).where(sql`${t.slideId} is not null`),
  index('learning_events_user').on(t.userId, t.createdAt),
])

export const generationJobs = pgTable('generation_jobs', {
  id: id(),
  type: jobTypeEnum('type').notNull(),
  status: jobStatusEnum('status').notNull().default('queued'),
  requestedBy: uuid('requested_by').references(() => users.id),
  idempotencyKey: text('idempotency_key').unique(),
  input: jsonb('input').notNull(),
  output: jsonb('output'),
  error: text('error'),
  errorCode: text('error_code'),
  attempts: integer('attempts').notNull().default(0),
  createdAt: now(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
}, (t) => [
  index('generation_jobs_user').on(t.requestedBy, t.createdAt),
])

export const supplementaryDrafts = pgTable('supplementary_drafts', {
  id: id(),
  slideId: uuid('slide_id').notNull().references(() => slides.id),
  jobId: uuid('job_id').references(() => generationJobs.id),
  slideContent: jsonb('slide_content'),
  widgetContent: jsonb('widget_content'),
  citations: jsonb('citations').notNull().default(sql`'[]'::jsonb`),
  status: text('status').notNull().default('draft'),
  mergedSlideId: uuid('merged_slide_id'),
  mergedItemIds: uuid('merged_item_ids').array(),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: now(),
  mergedAt: timestamp('merged_at', { withTimezone: true }),
})
