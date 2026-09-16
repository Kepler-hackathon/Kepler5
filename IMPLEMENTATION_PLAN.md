# KeplerLearn — Backend Implementation Plan

**Audience**: an implementing model or engineer starting the `keplerlearn` implementation repo from zero.
**Sources of truth**: `docs/PRD.md` (features), `docs/ui/screens_breakdown.md` (screens). This document turns them into a
buildable backend spec plus the AWS deployment. The frontend gets its own plan later; section 15 is the contract it will code against.

Conventions in this document: `MUST` = required for the PRD to be satisfied; `SHOULD` = do it unless there is a reason not to;
`MAY` = optional. Every `MUST` maps to a PRD user story (referenced as US-x.y).

---

## 0. Repository layout

```
keplerlearn/                      # implementation repo (new)
├── README.md
├── docker-compose.yml            # postgres + api + worker (local and production)
├── .env.example
├── backend/                      # everything in this plan
│   ├── pyproject.toml
│   ├── Dockerfile
│   ├── alembic.ini
│   ├── alembic/versions/
│   ├── app/
│   │   ├── main.py               # FastAPI factory, routers, CORS, static mount, /healthz
│   │   ├── config.py             # pydantic-settings Settings
│   │   ├── db.py                 # engine, SessionLocal, get_db dependency
│   │   ├── auth.py               # demo-role resolution (X-Demo-Role / X-Demo-User)
│   │   ├── errors.py             # ApiError + handlers -> {"error": {...}}
│   │   ├── models/               # SQLAlchemy 2.0 models, one file per aggregate
│   │   ├── schemas/              # Pydantic request/response models
│   │   ├── api/                  # routers: course, modules, lectures, uploads, wizard, faq, peer,
│   │   │                         #   practice, remediation, chat, analytics, review, me, jobs
│   │   ├── services/             # domain logic (tags, progress, publish, promotion, scoring)
│   │   ├── ai/                   # bedrock.py, embeddings.py, prompts/, schemas.py (widgets), validate.py, fake.py
│   │   ├── jobs/                 # queue.py, worker.py, handlers/
│   │   ├── storage/              # base.py, s3.py, local.py
│   │   └── seed/                 # seed.py + seed/decks/*.pdf (optional demo decks)
│   └── tests/
├── infra/terraform/              # copied from plan/terraform in the planning repo (section 14)
├── frontend/                     # later, separate plan; backend only needs frontend/dist at deploy time
└── docs/                         # PRD.md, screens_breakdown.md, this plan
```

Separation rule: the backend never imports, builds, or assumes anything about the frontend except one optional directory
(`FRONTEND_DIST`) of static files that it serves at `/` in production. All product behaviour is behind `/api/v1`.

---

## 1. Scope, principles and resolved decisions

The PRD's scope stands unchanged: 12 epics, two demo roles, no auth, no concept graph. Principles for this build:

1. One EC2 instance runs everything except AI and object storage (section 14).
2. Every generated artifact is **structured JSON validated against a fixed schema** (section 9). The model fills in content; the frontend owns rendering.
3. Interstitials are **pre-baked** (published with the module or merged by a teacher) or **reactive** (generated on a wrong answer and cached). Never generated at page-view time. (PRD §5.3)
4. Every taggable object carries the full `(module_id, lecture_id, slide_id, tag_level)` tuple, with parents always filled in. Filtering is then a plain equality on one column. (PRD §5.1, §7)
5. Anything that calls Bedrock and can take more than ~2 s runs as a **job**; the API returns a `job_id` immediately. (PRD §6.4)

Decisions on the PRD's open questions (§8):

| # | Question | Decision |
|---|---|---|
| 1 | Wrong-answer pattern for the cache key | `(question_id, selected_option_id)`. One widget per wrong option. Simple, deterministic, high reuse. |
| 2 | Concept mastery taxonomy | Each generated question carries a `concept_tag` chosen from `lectures.concepts` (3–8 short labels extracted per lecture during ingestion). Mastery = correct/attempts per tag. No graph. |
| 3 | Sequential unlock | Per-module boolean `sequential_unlock`, default `false`, set in the wizard. When true, lecture k is `locked` until lecture k-1 is `completed`. Computed on read. |
| 4 | Presenter notes | Per-lecture `presenter_notes_md` (from wizard) plus optional per-slide `slides.notes_md` editable by the teacher. Both teacher-only in responses. |

---

## 2. Stack

| Concern | Choice | Notes |
|---|---|---|
| Language / runtime | Python 3.12 | one language for API, jobs, PDF work, AI |
| Web | FastAPI 0.115+, uvicorn | sync endpoints (threadpool); SSE via `StreamingResponse` |
| ORM / migrations | SQLAlchemy 2.0 (sync), Alembic, psycopg 3 | `pgvector` Python package for the `vector` type |
| Validation / settings | Pydantic v2, pydantic-settings | Pydantic models double as structured-output schemas |
| DB | Postgres 16 + pgvector (`pgvector/pgvector:pg16` image) | relational data, job queue, cache, embeddings |
| AI | `anthropic[bedrock]` → `AnthropicBedrockMantle`; `boto3` for Titan embeddings | section 10 |
| PDF / PPTX | PyMuPDF (`pymupdf`), LibreOffice headless (`soffice`) for PPTX→PDF | in the backend image |
| Storage | S3 via boto3 (prod), local filesystem (dev/tests) | presigned URLs |
| Packaging | `uv` + `pyproject.toml`; Docker multi-stage | |
| Tests | pytest, httpx `TestClient`, a real Postgres | fake AI + local storage backends |

---

## 3. Configuration (`app/config.py`)

All settings come from environment variables (or `.env` locally). Names are final; the Terraform user-data writes the production values.

| Variable | Default | Meaning |
|---|---|---|
| `DATABASE_URL` | `postgresql+psycopg://kepler:kepler@localhost:5432/kepler` | |
| `APP_ENV` | `dev` | `dev` \| `test` \| `prod` |
| `API_PREFIX` | `/api/v1` | |
| `CORS_ORIGINS` | `http://localhost:5173` | comma-separated; empty disables CORS middleware |
| `FRONTEND_DIST` | `` | if set and the directory exists, serve it at `/` with SPA fallback to `index.html` |
| `STORAGE_BACKEND` | `local` | `local` \| `s3` |
| `LOCAL_STORAGE_DIR` | `./data/storage` | local backend root |
| `S3_BUCKET` | `` | required when `STORAGE_BACKEND=s3` |
| `PRESIGN_TTL_SECONDS` | `3600` | |
| `AWS_REGION` | `us-east-1` | Bedrock + S3 region |
| `AI_BACKEND` | `bedrock` | `bedrock` \| `fake` |
| `BEDROCK_MODEL_ID` | `anthropic.claude-opus-5` | Mantle client model id |
| `BEDROCK_FALLBACK_MODEL_ID` | `anthropic.claude-opus-4-8` | used once if the primary returns `stop_reason=refusal` |
| `EMBED_MODEL_ID` | `amazon.titan-embed-text-v2:0` | 1024-dim |
| `EMBED_DIM` | `1024` | must match the migration's `vector(1024)` |
| `WORKER_CONCURRENCY` | `3` | jobs processed in parallel per worker process |
| `WORKER_POLL_MS` | `500` | |
| `JOB_STALE_MINUTES` | `15` | running jobs older than this are requeued |
| `PEER_UPVOTE_THRESHOLD` | `5` | PRD §5.5 |
| `PRACTICE_MIN_QUESTIONS` / `PRACTICE_MAX_QUESTIONS` / `PRACTICE_PER_LECTURE` | `5` / `20` / `4` | section 8.5 |
| `OCR_FALLBACK` | `true` | describe image-only slides with the vision model |
| `MAX_DECK_MB` | `100` | |
| `LOG_LEVEL` | `info` | |

---

## 4. Demo identity and roles (`app/auth.py`)

No authentication (PRD §6.5). Every request MUST carry `X-Demo-Role: student|teacher`; missing or invalid → `401`.
Optional `X-Demo-User: <handle>` selects a specific seeded user; otherwise the role maps to `student-demo` / `prof-demo`.
The resolved `User` is a FastAPI dependency `current_user`. `require_teacher` raises `403` for students.
Mutating teacher endpoints (listed in section 7) MUST use `require_teacher` so the boundary is real even though auth is faked.

---

## 5. Database schema

Alembic migration `0001_initial` creates everything below. Use `uuid` PKs with `gen_random_uuid()`, `timestamptz` timestamps
with `created_at default now()`, `ON DELETE CASCADE` where noted. Enums are `text` columns with `CHECK` constraints (easier to migrate).
Enable extensions `vector` and `pgcrypto`.

### 5.1 Identity and course

```
users(id, handle text unique, name text, role check('student','teacher'), created_at)
courses(id, code text, name text, semester text, instructor_id -> users, created_at)
```

### 5.2 Content

```
modules(id, course_id -> courses, name text not null, overview_md text default '', objectives jsonb default '[]',
        schedule_notes text default '', order_index int not null, status check('draft','processing','published') default 'draft',
        sequential_unlock bool default false, ai_opt_in bool default false, items_per_lecture int default 4,
        published_at timestamptz, created_at, updated_at)
  index (course_id, order_index)

lectures(id, module_id -> modules cascade, title text not null, order_index int not null,
         deck_key text, deck_filename text, deck_content_type text,
         parse_status check('pending','parsing','parsed','failed') default 'pending', parse_error text,
         slide_count int default 0, concepts jsonb default '[]', presenter_notes_md text default '', created_at, updated_at)
  unique (module_id, order_index) deferrable initially deferred

slides(id, lecture_id -> lectures cascade, sort_key double precision not null,
       kind check('deck','supplementary') default 'deck', page_number int, title text,
       text text default '', body_md text, image_key text, thumb_key text, width int, height int,
       notes_md text default '', embedding vector(1024), created_at)
  index (lecture_id, sort_key); index hnsw (embedding vector_cosine_ops)
```
`slides.index` is **not stored**. The API exposes `index = row_number() over (partition by lecture_id order by sort_key) - 1`.
Deck slides get `sort_key = page_number`. A supplementary slide inserted after slide k gets `sort_key = (k.sort_key + next.sort_key)/2`
(or `k.sort_key + 1` if k is last). Anything that needs a stable reference to a position stores a `slide_id`, never an index.

```
knowledge_anchors(id, module_id -> modules cascade, type check('textbook','problem_bank'), file_key text, filename text,
                  status check('pending','indexing','indexed','failed') default 'pending', error text,
                  page_count int, chunk_count int default 0, created_at)
anchor_chunks(id, anchor_id -> knowledge_anchors cascade, page_number int, chunk_index int, text text, embedding vector(1024))
  index hnsw (embedding vector_cosine_ops)
```

### 5.3 Generated content

```
quiz_questions(id, lecture_id -> lectures cascade, source_slide_id -> slides set null,
               origin check('wizard','practice','supplementary'), status check('pending','approved','discarded'),
               after_slide_id -> slides set null,            -- interstitial position; null = not an interstitial
               prompt text, options jsonb,                    -- [{"id":"a","text":"..."}, ...] 2..5 options, ids a..e
               correct_option_id text, explanation_md text, concept_tag text, created_at)
  index (lecture_id, status); index (after_slide_id)

widgets(id, lecture_id -> lectures cascade, source_slide_id -> slides set null,
        origin check('wizard','reactive','chat','supplementary'),
        widget_type check('trace_stepper','dynamic_slider','predict_check'), content jsonb,
        interstitial_status check('none','pending','approved','discarded','merged','archived') default 'none',
        after_slide_id -> slides set null, concept_tag text, created_by -> users set null, created_at)
  index (lecture_id, interstitial_status); index (after_slide_id)

remediation_cache(question_id -> quiz_questions cascade, selected_option_id text, widget_id -> widgets,
                  explanation_md text, created_at, primary key (question_id, selected_option_id))

supplements(id, slide_id -> slides cascade,            -- the struggling slide this supplements
            lecture_id -> lectures cascade, title text, body_md text, widget_id -> widgets,
            status check('draft','merged','discarded') default 'draft', new_slide_id -> slides,
            created_by -> users, created_at, merged_at)
```

### 5.4 Learning activity

```
quiz_attempts(id, user_id -> users, question_id -> quiz_questions cascade, lecture_id, slide_id,
              selected_option_id text, correct bool, context check('lecture','practice'),
              practice_session_id uuid, created_at)
  index (question_id); index (slide_id); index (user_id, created_at)

practice_quiz_sessions(id, user_id -> users, module_ids jsonb, lecture_ids jsonb, question_ids jsonb,
                       answers jsonb default '{}',        -- {question_id: option_id}
                       status check('in_progress','completed') default 'in_progress',
                       score_correct int, score_total int, created_at, completed_at)

student_progress(user_id -> users, lecture_id -> lectures cascade,
                 status check('not_started','in_progress','completed') default 'in_progress',
                 last_slide_id -> slides set null, max_slide_index int default 0, updated_at,
                 primary key (user_id, lecture_id))

widget_feedback(widget_id -> widgets cascade, user_id -> users, helpful bool, created_at, primary key (widget_id, user_id))
```

### 5.5 Community

```
faq_threads(id, course_id -> courses, author_id -> users, module_id -> modules cascade not null,
            lecture_id -> lectures cascade, slide_id -> slides cascade, tag_level check('module','lecture','slide'),
            title text, body_md text, category check('concept','logistics','other'), suggested_slide_id -> slides,
            status check('open','answered') default 'open', upvote_count int default 0, reply_count int default 0,
            endorsed_reply_id uuid, created_at, updated_at)
  index (module_id), (lecture_id), (slide_id), (status, created_at desc)

faq_replies(id, thread_id -> faq_threads cascade, author_id -> users, body_md text, is_instructor bool,
            endorsed bool default false, upvote_count int default 0, created_at)

peer_submissions(id, widget_id -> widgets cascade unique, student_id -> users,
                 module_id -> modules cascade, lecture_id -> lectures cascade, slide_id -> slides cascade, tag_level,
                 notes_md text default '',
                 status check('pending_review','pending_teacher_review','approved_merged','edits_requested','archived')
                   default 'pending_review',
                 upvote_count int default 0, review_note_md text, reviewed_by -> users, reviewed_at, created_at)
  index (status, upvote_count desc), (module_id), (lecture_id), (slide_id)

votes(user_id -> users, target_type check('faq_thread','faq_reply','peer_submission'), target_id uuid, created_at,
      primary key (user_id, target_type, target_id))
```

### 5.6 Chat

```
chat_threads(id, user_id -> users, scope_type check('slide','lecture','module','course'), scope_id uuid,
             title text, created_at, updated_at)
chat_messages(id, thread_id -> chat_threads cascade, role check('user','assistant'), content_md text,
              citations jsonb default '[]',      -- [{"slide_id","lecture_id","slide_index","quote"}]
              widget_id -> widgets set null, created_at)
```

### 5.7 Analytics cache and jobs

```
slide_insights(slide_id -> slides cascade primary key, input_hash text, summary_md text,
               misconceptions jsonb,             -- [{"label","description","evidence_count"}]
               recommendation_md text, computed_at)

jobs(id, type text, payload jsonb, status check('queued','running','succeeded','failed','cancelled') default 'queued',
     attempts int default 0, max_attempts int default 3, dedupe_key text, parent_id -> jobs,
     run_after timestamptz default now(), locked_by text, locked_at timestamptz,
     progress jsonb default '{}', result jsonb, error text, created_at, updated_at, finished_at)
  unique index (dedupe_key) where status in ('queued','running')
  index (status, run_after, created_at); index (parent_id)
```

---

## 6. Domain rules (`app/services/`)

**Tags** (`services/tags.py`). `resolve_tag(db, module_id, lecture_id=None, slide_id=None) -> Tag(module_id, lecture_id, slide_id, level)`.
Fills parents from the most specific id given, verifies ancestry (slide ∈ lecture ∈ module) and raises `422 invalid_tag` otherwise.
Used by FAQ compose, widget publish, chat scope and every filter. Filtering by `module_id`/`lecture_id`/`slide_id` is an equality on that
column; because parents are always filled, "everything under lecture X" is `lecture_id = X`.

**Lecture status for a student** (`services/progress.py`): `completed` if progress row is completed; `in_progress` if a row exists;
`locked` if `module.sequential_unlock` and the previous lecture (by `order_index`) is not completed; else `not_started`.
`POST /lectures/{id}/progress` sets `in_progress`, updates `last_slide_id` and `max_slide_index`; when `max_slide_index == slide_count-1` → `completed`.

**Module progress** = completed lectures / total lectures (percent, integer).

**Pulse chips**: per module `open_questions = count(faq_threads where module_id and status='open')`,
`peer_widgets = count(peer_submissions where module_id and status in ('pending_review','pending_teacher_review','approved_merged'))`.
Course-wide (`GET /course`): `open_questions`, `pending_peer_submissions` (status `pending_review`), `review_queue` (teacher only, status `pending_teacher_review`).

**Peer promotion** (`services/promotion.py`, US-2.5). Inside the vote transaction: after inserting the vote and incrementing
`upvote_count`, if `upvote_count >= PEER_UPVOTE_THRESHOLD and status == 'pending_review'` → `status = 'pending_teacher_review'`.
Removing a vote never demotes. The submission's status is the single source for badges on Screens 2, 7 and 10.

**Publishing a module** (`services/publish.py`, US-9.8): requires every lecture `parsed`. In one transaction: `quiz_questions`/`widgets`
with origin `wizard` and status `pending` → `approved`; those the teacher unchecked (already `discarded`) stay discarded; module
`status='published'`, `published_at=now()`. Re-publishing an already published module is allowed (idempotent).

**Interstitial ordering in a bundle**: items with `after_slide_id = S` render after slide S, quizzes before widgets, then by `created_at`.

**Voting** is a toggle: `POST .../vote` inserts if absent (returns `{voted: true, count}`) or deletes if present.

---

## 7. API contract

Conventions: base path `/api/v1`; JSON everywhere except uploads and SSE; ids are UUID strings; times are ISO-8601 UTC.
Errors: `{"error": {"code": "<snake_case>", "message": "<human>", "details": {...}?}}` with HTTP 400/401/403/404/409/422/500.
Lists take `limit` (default 50, max 200) and `offset`. The OpenAPI document is served at `/api/v1/openapi.json`; the frontend generates its client from it.
`(T)` marks teacher-only endpoints (`require_teacher`). `(S)` student-only. Everything else works for both roles.

### 7.1 Health, identity, course

| Method | Path | Notes |
|---|---|---|
| GET | `/healthz` | `{"ok": true, "db": true}` (outside the prefix) |
| GET | `/me` | current demo user `{id, handle, name, role}` |
| GET | `/course` | `{course, pulse: {open_questions, pending_peer_submissions, review_queue?}}` |

### 7.2 Modules and lectures (US-1.x, US-3.x, US-9.1–9.3)

| Method | Path | Body → Response |
|---|---|---|
| GET | `/modules` | `ModuleCard[]` ordered by `order_index`. Students see `published` only; teachers see all. Card: `{id, name, status, order_index, lecture_count, progress_pct, pulse{open_questions, peer_widgets}, thumbnail_url}` (thumbnail = first slide thumb of first lecture, nullable) |
| POST (T) | `/modules` | `{name, overview_md?, objectives?: string[], schedule_notes?, sequential_unlock?}` → `Module` (status draft, `order_index` = max+1) |
| GET | `/modules/{id}` | `ModuleDetail`: module fields + `lectures: LectureRow[]` (`{id, title, order_index, slide_count, parse_status, student_status, last_slide_index, thumbnail_url}`) + `anchors[]` + `pulse` + `progress_pct` |
| PATCH (T) | `/modules/{id}` | any of the POST fields + `ai_opt_in`, `items_per_lecture` |
| PUT (T) | `/modules/{id}/lecture-order` | `{lecture_ids: string[]}` (must be a permutation) → reassigns `order_index` 0..n-1 (US-9.2) |
| DELETE (T) | `/modules/{id}` | only when `status='draft'` |
| POST (T) | `/modules/{id}/lectures` | `{items: [{title?, deck_key, filename, content_type}]}` → `LectureRow[]` appended in order; title defaults to filename stem |
| PATCH (T) | `/lectures/{id}` | `{title?, presenter_notes_md?}` |
| DELETE (T) | `/lectures/{id}` | module must be draft |
| GET | `/lectures/{id}/slides` | `[{id, index, kind, title, thumb_url}]` for pickers (FAQ compose slide step) |
| PATCH (T) | `/slides/{id}` | `{notes_md?, title?}` |
| POST (T) | `/modules/{id}/anchors` | `{type, file_key, filename}` → `Anchor`; enqueues nothing until `/process` |
| DELETE (T) | `/anchors/{id}` | |

### 7.3 Uploads

| Method | Path | Body → Response |
|---|---|---|
| POST (T) | `/uploads/presign` | `{kind: 'deck'\|'anchor', filename, content_type}` → `{key, upload_url, method: 'PUT', headers: {'Content-Type': ...}}` |
| PUT (T) | `/uploads/local/{key}` | dev only (`STORAGE_BACKEND=local`): raw body stored at key |

Allowed content types: `application/pdf`, `application/vnd.openxmlformats-officedocument.presentationml.presentation`, `application/vnd.ms-powerpoint`.
Key pattern: `uploads/{kind}/{uuid4}/{sanitized_filename}`.

### 7.4 Wizard processing (US-9.4–9.8)

| Method | Path | Body → Response |
|---|---|---|
| POST (T) | `/modules/{id}/process` | `{generate: bool, items_per_lecture: int (1..10)}` → `{job_id}`. Sets module `processing`; stores `ai_opt_in`/`items_per_lecture`; creates the job tree (section 8.3). `409` if a process job is already running. |
| GET (T) | `/modules/{id}/process` | `ProcessStatus`: `{job_id, status, steps: [{step: 'parse'\|'index'\|'generate', lecture_id?, anchor_id?, label, status, error?, attempts}], can_retry, can_cancel}` |
| POST (T) | `/modules/{id}/process/cancel` | queued children → `cancelled`; running ones finish their current lecture; module back to `draft`; inputs untouched (US-9.5) |
| POST (T) | `/modules/{id}/process/retry` | re-enqueues only `failed` children (US-9.6) |
| GET (T) | `/modules/{id}/review` | `{lectures: [{id, title, order_index, slide_count, items: ReviewItem[]}]}`; `ReviewItem = {kind: 'quiz'\|'widget', id, approved: bool, after_slide_index, concept_tag, question?, widget?}` (US-9.7) |
| PATCH (T) | `/review-items/{kind}/{id}` | `{approved: bool}` → toggles `pending`↔`discarded` |
| POST (T) | `/modules/{id}/publish` | → `Module` (section 6) |

### 7.5 Lecture bundle, progress, inline quiz (US-4.x, US-10.x)

| Method | Path | Body → Response |
|---|---|---|
| GET | `/lectures/{id}/bundle` | `LectureBundle` (below). Teachers additionally get `notes_md` per slide and `presenter_notes_md`. |
| POST | `/lectures/{id}/progress` | `{slide_id}` → `Progress` |
| POST | `/lectures/{id}/quiz-answers` | `{question_id, option_id}` → `{correct, correct_option_id}`; records a `quiz_attempts` row with `context='lecture'` |

```jsonc
// LectureBundle
{
  "lecture": {"id","module_id","title","order_index","slide_count","concepts":[],"presenter_notes_md"?},
  "module":  {"id","name","sequential_unlock"},
  "slides":  [{"id","index","kind","title","text","body_md","image_url","thumb_url","width","height","notes_md"?}],
  "interstitials": [
    {"id","kind":"quiz","after_slide_id","after_slide_index","question":{"id","prompt","options":[{"id","text"}],"concept_tag"}},
    {"id","kind":"widget","after_slide_id","after_slide_index","widget":{"id","widget_type","content","origin"}}
  ],
  "progress": {"status","last_slide_id","max_slide_index"} | null,
  "faq_counts": {"<slide_id>": {"open": 1, "total": 3}},
  "nav": {"prev_lecture_id","next_lecture_id"}
}
```
Rules: only `approved`/`merged` items appear; `correct_option_id` never ships in a bundle; `image_url`/`thumb_url` are presigned GETs
(`PRESIGN_TTL_SECONDS`); text and metadata are eager, images lazy (PRD §7 bundle size).

### 7.6 Remediation and widgets (US-5.x, US-6.3)

| Method | Path | Body → Response |
|---|---|---|
| POST | `/remediation` | `{question_id, selected_option_id, context: 'lecture'\|'practice', practice_session_id?}` → cache hit: `{status:'ready', widget, explanation_md}`; miss: `{status:'pending', job_id}` (`202`) |
| GET | `/jobs/{id}` | `{id, type, status, progress, result?, error?}`; for `generate_remediation` the result is `{widget, explanation_md}` |
| POST | `/widgets/{id}/feedback` | `{helpful: bool}` (upsert) |
| POST (S) | `/widgets/{id}/publish` | `{notes_md?, module_id?, lecture_id?, slide_id?}` → `PeerSubmission`. Tag defaults to the widget's `source_slide_id`; body tag required if the widget has none. Only `origin in ('reactive','chat')` and `created_by == me`. `409` if already published. |

### 7.7 Practice quizzes (US-6.x, US-8.3)

| Method | Path | Body → Response |
|---|---|---|
| GET | `/practice/selection-tree` | `[{module_id, name, lectures: [{id, title, question_count}]}]` published only |
| POST | `/practice/sessions` | `{module_ids: [], lecture_ids: []}` → `PracticeSession` with `questions: [{id, prompt, options, lecture_id, lecture_title, concept_tag}]` (no answers). Section 8.5. |
| GET | `/practice/sessions/{id}` | session + questions + answers so far |
| POST | `/practice/sessions/{id}/answers` | `{question_id, option_id}` → `{correct, correct_option_id}`; records attempt with `context='practice'` |
| POST | `/practice/sessions/{id}/complete` | → `{score_correct, score_total, missed: [{question_id, selected_option_id}]}` |
| GET | `/practice/sessions/{id}/questions/{qid}/answer` | `{correct_option_id, explanation_md}` ("Just Show Answer", lazy) |
| POST | `/practice/sessions/{id}/retake` | new session, same selection, fresh draw |

"Explain with Widget" on a missed row calls `POST /remediation` with `context='practice'`.

### 7.8 FAQ forum (US-2.1–2.3, US-4.4)

| Method | Path | Body → Response |
|---|---|---|
| GET | `/faq/threads` | query `filter=all\|unanswered\|endorsed`, `module_id`, `lecture_id`, `slide_id`, `q`, `limit`, `offset` → `FaqThreadCard[]` (`{id, title, excerpt, author, tag{module,lecture,slide,level, labels}, status, category, upvote_count, reply_count, has_endorsed, my_vote, created_at}`) |
| POST | `/faq/threads` | `{title, body_md, module_id, lecture_id?, slide_id?}` → `FaqThread`; enqueues `classify_faq` |
| GET | `/faq/threads/{id}` | thread + `replies[]` (endorsed reply first) |
| POST | `/faq/threads/{id}/replies` | `{body_md}`; `is_instructor = role == teacher` |
| POST (T) | `/faq/replies/{id}/endorse` | sets `endorsed`, thread `endorsed_reply_id`, `status='answered'`; a second call on another reply moves the endorsement |
| POST | `/faq/threads/{id}/vote`, `/faq/replies/{id}/vote` | toggle |
| GET | `/slides/{id}/faq` | threads tagged to that slide (sidebar tab) |
| GET | `/lectures/{id}/faq` | threads with `lecture_id = X` (lecture-wide tab) |

`filter=unanswered` → `reply_count = 0`; `filter=endorsed` → `endorsed_reply_id is not null`.

### 7.9 Peer widgets and review queue (US-2.4–2.5, US-12.x)

| Method | Path | Body → Response |
|---|---|---|
| GET | `/peer-widgets` | query `status`, `module_id`, `lecture_id`, `slide_id`, `sort=top\|new` → `PeerWidgetCard[]` (`{id, widget{id, widget_type, content}, student{handle,name}, tag, status, upvote_count, my_vote, notes_md, created_at}`) |
| GET | `/peer-widgets/{id}` | card + review note |
| POST | `/peer-widgets/{id}/vote` | toggle; runs promotion rule |
| GET (T) | `/review-queue` | submissions with `status in ('pending_teacher_review','edits_requested')`, oldest first, each with `target: {module_name, lecture_title, slide_index, slide_title, slide_thumb_url}` for the positioning banner |
| POST (T) | `/review-queue/{id}/approve` | `{after_slide_id?}` → merges: widget `interstitial_status='merged'`, `after_slide_id` (from body, else the submission's `slide_id`; `422` if neither), `lecture_id` set; submission `approved_merged` |
| POST (T) | `/review-queue/{id}/request-edits` | `{note_md}` → `edits_requested` |
| POST (T) | `/review-queue/{id}/decline` | `{note_md?}` → `archived`; widget `interstitial_status='archived'` |

### 7.10 Chat (US-4.5–4.6, US-8.x)

| Method | Path | Body → Response |
|---|---|---|
| GET | `/chat/threads` | query `scope_type`, `scope_id` → my threads, newest first |
| POST | `/chat/threads` | `{scope_type, scope_id?, title?}` → `ChatThread` |
| GET | `/chat/threads/{id}` | thread + `messages[]` |
| PATCH | `/chat/threads/{id}` | `{scope_type, scope_id?}` widen/narrow scope (escalation keeps history, US-4.6) |
| POST | `/chat/threads/{id}/messages` | `{content}` → **SSE stream** (below) |
| POST | `/chat/threads/{id}/quiz` | → `PracticeSession` scoped to the lectures cited or in scope (US-8.3) |

SSE (`text/event-stream`), each event `event: <name>\ndata: <json>\n\n`:
`message_start {message_id}` → many `text {delta}` → optional `widget {widget:{id, widget_type, content}}` →
`citation {slide_id, lecture_id, slide_index, quote}` (0..n, emitted after the text block completes) → `done {message_id, citations:[...]}` or `error {message}`.
The assistant message is persisted before `done` is sent. Heartbeat comment `: ping` every 15 s while waiting.

### 7.11 Analytics and supplements (US-11.x)

| Method | Path | Body → Response |
|---|---|---|
| GET (T) | `/analytics/overview` | per module → per lecture: `{attempts, wrong_rate, open_faq, red_slides}` |
| GET (T) | `/analytics/lectures/{id}/heatmap` | `[{slide_id, index, title, thumb_url, attempts, wrong, wrong_rate, faq_count, open_faq_count, mastery, level: 'green'\|'yellow'\|'red'\|'none', low_confidence}]` |
| GET (T) | `/analytics/slides/{id}` | `{stats, questions: [{id, prompt, attempts, options: [{id, text, count, correct}]}], threads: FaqThreadCard[] (top 10 by upvotes), insights: SlideInsights\|null, insights_job_id?}` |
| POST (T) | `/analytics/slides/{id}/insights` | → `{job_id}` or `{insights}` if the `input_hash` is unchanged (section 8.8) |
| POST (T) | `/analytics/slides/{id}/supplement` | → `{job_id}`; result `{supplement_id}` |
| GET (T) | `/supplements/{id}` | `{id, slide_id, title, body_md, widget{...}, status}` |
| POST (T) | `/supplements/{id}/merge` | inserts the supplementary slide after `slide_id`, widget `merged` after the new slide → `{new_slide_id}` |
| POST (T) | `/supplements/{id}/discard` | |

Heatmap SQL (per slide of the lecture): `attempts` = attempts on questions with `source_slide_id = s`; `wrong_rate = wrong/attempts`;
`faq_count` = threads with `slide_id = s`; `level`: `none` if attempts=0 and faq=0; `red` if `wrong_rate >= 0.5` or `open_faq >= 3`;
`yellow` if `wrong_rate >= 0.25` or `open_faq >= 1`; else `green`; `low_confidence = attempts < 5`; `mastery = 1 - wrong_rate` (null if attempts=0).
Computed on read; at hackathon scale this is a single grouped query. (PRD §6.2 pipeline 4 becomes a query; materialize later if needed.)

### 7.12 Student hub (US-7.x)

| Method | Path | Response |
|---|---|---|
| GET | `/me/progress` | `{modules: [{id, name, completed, total}], accuracy_trend: [{day, lecture_pct, practice_pct}] (14 days), mastery: [{concept_tag, attempts, correct, pct}]}` |
| GET | `/me/submissions` | `{widgets: PeerWidgetCard[], questions: [{thread_id, title, status, reply_count, has_endorsed, upvote_count, created_at}]}` |

---

## 8. Jobs and pipelines

### 8.1 Queue (`app/jobs/queue.py`)

`enqueue(db, type, payload, *, dedupe_key=None, parent_id=None, max_attempts=3) -> Job`. If `dedupe_key` collides with a queued/running job,
return that job instead of inserting (catch the unique violation in a savepoint).

Claim query (one job per call):
```sql
UPDATE jobs SET status='running', locked_by=:worker, locked_at=now(), attempts=attempts+1, updated_at=now()
WHERE id = (SELECT id FROM jobs WHERE status='queued' AND run_after <= now()
            ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED)
RETURNING *;
```
Completion: `succeeded` with `result`, or on exception: if `attempts < max_attempts` and the error is retryable (`RetryableError`, Bedrock
throttling, connection errors) → `status='queued', run_after = now() + 2^attempts * 5s`; else `failed` with `error`. Stale recovery every
60 s: `running` jobs with `locked_at < now() - JOB_STALE_MINUTES` → `queued`. After any child finishes, call `on_child_finished(parent_id)`.

### 8.2 Worker (`app/jobs/worker.py`)

`python -m app.jobs.worker`: a `ThreadPoolExecutor(WORKER_CONCURRENCY)`; the main loop claims a job when a slot is free, else sleeps
`WORKER_POLL_MS`. Handlers are registered in a dict `{type: callable(job, ctx)}`. `ctx` exposes `db`, `ai`, `storage`, `settings`,
`set_progress(dict)` and `cancelled()` (re-reads the parent's status; handlers check it between lectures/steps). Graceful shutdown on SIGTERM.

### 8.3 `module_process` orchestration (US-9.5, 9.6)

`POST /modules/{id}/process` creates a parent job `module_process {module_id, generate, items_per_lecture}` and children:
`parse_deck {lecture_id}` for each lecture whose `parse_status != 'parsed'` (already-parsed lectures are listed as `succeeded` steps
without a job), and `index_anchor {anchor_id}` for each anchor not `indexed`. Dedupe key `module_process:{module_id}`.

`on_child_finished(parent)`: when all `parse_deck`/`index_anchor` children are terminal: if any failed → parent `failed` (retry re-enqueues
only failed children under the same parent); else if `generate` and no `generate_items` children exist yet → enqueue one
`generate_items {lecture_id, items_per_lecture}` per lecture (dedupe `generate_items:{lecture_id}`); when those are terminal → parent
`succeeded` or `failed`. Cancel: parent `cancelled`, queued children `cancelled`; a running handler checks `ctx.cancelled()` before each
expensive step and exits early with `cancelled`. Module status: `processing` while parent is queued/running; `draft` after cancel/fail; stays
`draft` after success until publish.

### 8.4 `parse_deck` (PRD §6.2 pipeline 1)

1. Download `deck_key` to a temp dir. If not PDF: `soffice --headless --convert-to pdf --outdir <tmp> <file>` (timeout 180 s).
2. Open with PyMuPDF. For each page `p` (0-based): `text = page.get_text("text").strip()`; render `page.get_pixmap(matrix=fitz.Matrix(2,2))`
   → JPEG q85 as `lectures/{lecture_id}/slides/{p:04d}.jpg`; thumbnail 320 px wide → `.../thumb_{p:04d}.jpg`. Title = first non-empty line
   (≤ 80 chars) or `Slide {p+1}`.
3. If `OCR_FALLBACK` and `len(text) < 20`: one vision call (image + "Describe the slide's content as text a student could search") → `text`.
4. In one transaction: delete existing `deck` slides for the lecture; insert rows with `sort_key = p`; set `slide_count`, `parse_status='parsed'`.
5. Embeddings: `embed([slide.text or slide.title])` → `slides.embedding`.
6. Concepts: one structured call over all slide texts → `Concepts {concepts: list[str] (3..8, ≤ 3 words each)}` → `lectures.concepts`.
Idempotent: if the lecture is already `parsed` with the same `deck_key`, return immediately. On any exception → `parse_status='failed'`, `parse_error`.

`index_anchor`: download PDF → per page text → chunks of ~3000 chars with 300 overlap → embed → `anchor_chunks`; status `indexed`.

### 8.5 `generate_items` (PRD §6.2 pipeline 2) and practice generation

Input: slides `[{index, title, text}]`, `lectures.concepts`, module objectives, `n = items_per_lecture`. Structured output
`GenerationBatch {items: list[GeneratedQuiz | GeneratedWidget]}` where
`GeneratedQuiz {kind:'quiz', after_slide_index, concept_tag, prompt, options[{id,text}], correct_option_id, explanation_md}` and
`GeneratedWidget {kind:'widget', after_slide_index, concept_tag, widget: Widget}` (section 9). Prompt rules: exactly `n` items, at least
`ceil(n/2)` quizzes, each grounded in the slide at `after_slide_index` or earlier, `concept_tag ∈ concepts`, distinct slides where possible.
Validate (section 9.4); invalid items get one repair round, then are dropped. Insert `quiz_questions` (`origin='wizard'`, `status='pending'`,
`after_slide_id` = id of slide at `after_slide_index`) and `widgets` (`origin='wizard'`, `interstitial_status='pending'`).
Re-running deletes previous `pending` wizard items for the lecture first (approved ones are kept).

Practice sessions (`services/practice.py`): resolve `lecture_ids` = explicit lectures ∪ all lectures of selected modules (published only).
`target = clamp(PRACTICE_PER_LECTURE * n_lectures, PRACTICE_MIN_QUESTIONS, PRACTICE_MAX_QUESTIONS)`. Pool = `quiz_questions` with
`status='approved'` in those lectures. If `pool < target`, generate `min(target - pool, 10)` more **synchronously** (structured call
`PracticeBatch {questions: list[GeneratedQuiz]}`, balanced across lectures) with `origin='practice'`, `status='approved'`, `after_slide_id=null`
(never interstitials). Draw `target` questions round-robin across lectures, shuffled. No manual count control (PRD non-goal).

### 8.6 `generate_remediation` (PRD §6.2 pipeline 3, US-5.1, US-5.4)

`POST /remediation` → look up `remediation_cache(question_id, selected_option_id)`. Hit → return immediately. Miss → enqueue
`generate_remediation {question_id, selected_option_id}` with `dedupe_key = 'remediation:{question_id}:{selected_option_id}'` and return
`202 {job_id}` (two students missing the same option at once share one job). Handler: build context = question + all options + correct
option + selected wrong option + source slide text (±1 neighbour) + top-3 `anchor_chunks` by cosine similarity to `prompt + slide.text`
(module's anchors only) + `concept_tag`. Structured output `Remediation {widget: Widget, explanation_md}`. Guidance in the prompt:
`trace_stepper` for execution/order-of-operations misconceptions, `dynamic_slider` for quantitative relationships, `predict_check` for
conceptual ones. Insert widget (`origin='reactive'`, `created_by` = requesting user, `source_slide_id`, `lecture_id`), write-through the cache,
job `result = {widget, explanation_md}`. The drawer polls `GET /jobs/{id}` every 1 s (skeleton shown from the `202`).

### 8.7 Chat (`services/chat.py`, US-4.5, US-8.1–8.2)

Context assembly by `scope_type`:
- `slide`: the slide, its two neighbours, lecture title.
- `lecture`: all slides of the lecture.
- `module`: all slides of the module if total text ≤ 120k characters, else retrieval.
- `course`: retrieval.
Retrieval = embed the user message (Titan), take top 12 by cosine over `slides.embedding` (published modules) ∪ `anchor_chunks.embedding`,
plus the current scope's slide if any. Each context item becomes a `document` block (section 10.3) so answers carry citations.
Inline visuals: expose one client-side tool `render_widget` (`strict: true`, input schema = the `Widget` union); the system prompt says to
use it only when a visual would genuinely help. When called: validate, insert widget (`origin='chat'`), emit `widget` SSE event, return
`tool_result` "rendered", continue the turn (max 2 tool rounds). History: prior messages of the thread (text only), capped at the last 20.
`POST /chat/threads/{id}/quiz`: lectures = lectures of cited slides in the thread ∪ lecture(s) in scope → `services.practice.create_session`.

### 8.8 `classify_faq`, `slide_insights`, `generate_supplement`

- `classify_faq {thread_id}` (platform.md item 1): structured `FaqClassification {category: 'concept'|'logistics'|'other', suggested_slide_index: int|null}`
  given the thread and the slides of its lecture (if tagged at lecture level). Writes `category`, `suggested_slide_id`. Never changes the author's tag.
- `slide_insights {slide_id}`: input = slide text, per-option wrong counts, top FAQ titles/bodies (≤ 10). `input_hash = sha256(attempts_count, wrong_count, faq_count, latest_thread_id)`;
  if equal to the stored hash, the endpoint returns the cached row without a job. Output `SlideInsights {summary_md, misconceptions[{label, description, evidence_count}], recommendation_md}` (US-11.1, US-11.2 card).
- `generate_supplement {slide_id, user_id}` (PRD §6.2 pipeline 5): input = slide text, insights (compute inline if missing), top-3 textbook chunks. Output
  `Supplement {title, body_md, widget: Widget}`. Creates `widgets` (`origin='supplementary'`, `interstitial_status='none'`) and `supplements` (`draft`).
  Merge (7.11) inserts `slides(kind='supplementary', title, body_md, sort_key between)` and sets the widget `merged` with `after_slide_id = new slide`.

---

## 9. Widget content schemas (`app/ai/schemas.py`)

Three fixed types (PRD §6.3). Pydantic models with `model_config = ConfigDict(extra='forbid')`, **all fields required** (use `| None` for
optional values) so the generated JSON Schema is valid for structured outputs and strict tools. `Widget = Annotated[TraceStepper | DynamicSlider | PredictCheck, Field(discriminator='type')]`.

```python
class Citation(BaseModel):            # where in the deck this came from
    slide_index: int                  # 0-based within the lecture
    quote: str                        # ≤ 200 chars from the slide text

class TraceStepper(BaseModel):
    type: Literal['trace_stepper']
    title: str; intro_md: str; summary_md: str
    code: Code                        # {language: str, source: str}   (≤ 40 lines)
    steps: list[TraceStep]            # 2..12; {line: int (1-based, ≤ line count), state: list[Var{name, value}], note_md: str}
    citations: list[Citation]

class DynamicSlider(BaseModel):
    type: Literal['dynamic_slider']
    title: str; intro_md: str; summary_md: str
    input: SliderInput                # {name: str, label: str, min: float, max: float, step: float, default: float, unit: str | None}
    outputs: list[SliderOutput]       # 1..4; {name, label, formula: str, unit: str | None}
    notes: list[SliderNote]           # 0..6; {range_min: float, range_max: float, note_md: str}
    citations: list[Citation]

class PredictCheck(BaseModel):
    type: Literal['predict_check']
    title: str; intro_md: str; summary_md: str
    scenario_md: str                  # code or situation to reason about
    prompt_md: str                    # the question
    options: list[Option]             # 2..5; {id: 'a'..'e', text}
    correct_option_id: str
    feedback: list[OptionFeedback]    # one per option; {option_id, feedback_md}
    citations: list[Citation]
```

### 9.1 Formula grammar (slider)

`formula` is a string over variable `x` (the input's `name` is aliased to `x`): numbers, `x`, `+ - * / ^ %`, parentheses, and functions
`sqrt log log2 log10 exp abs floor ceil round min max pow factorial`. Backend validates with a Python `ast` whitelist evaluator
(`ai/formula.py`) by evaluating at `min`, `max`, `default`; frontend implements the same grammar. Constraints: `min < max`, `step > 0`,
`(max-min)/step ≤ 1000`, `default ∈ [min,max]`, `factorial` only on integer results ≤ 20.

### 9.2 Validation (`ai/validate.py`)

`validate_widget(widget, slide_count)`: schema (Pydantic) + semantic checks (trace lines within source, unique option ids, correct id
present, feedback covers every option, citations' `slide_index < slide_count`, formulas evaluate). Returns a list of error strings.
Generation handlers run one repair round: send the errors and the invalid JSON back and ask for a corrected object; drop on second failure.

### 9.3 Quiz question schema

`GeneratedQuiz` (section 8.5): 2..5 options with ids `a..e` in order, `correct_option_id ∈ ids`, `prompt ≤ 400 chars`, `explanation_md ≤ 1200 chars`.

---

## 10. AI layer (`app/ai/`)

### 10.1 Client

```python
from anthropic import AnthropicBedrockMantle
client = AnthropicBedrockMantle(aws_region=settings.aws_region)   # credentials: instance role / env / profile
```
Model ids are the Bedrock-prefixed ids (`anthropic.claude-opus-5`). Use the client exactly like `Anthropic()`.
Do not pass `thinking` (Opus 5 runs adaptive thinking by default) and do not pass `temperature`/`top_p` (rejected on Opus 5).
Set `output_config={"effort": ...}`: `low` for chat and classification, `medium` for generation, remediation, insights and supplements.
`max_tokens`: 16000 for non-streaming structured calls, 8000 for streamed chat.

`AI` interface (`ai/base.py`), implemented by `BedrockAI` and `FakeAI` (deterministic canned outputs per schema type, used in tests and `AI_BACKEND=fake`):

```python
class AI(Protocol):
    def structured(self, *, system: str, content: list[dict], schema: type[T], effort: str = "medium") -> T
    def stream_chat(self, *, system: str, messages: list[dict], tools: list[dict] | None) -> Iterator[ChatEvent]
    def describe_image(self, *, image_bytes: bytes, media_type: str, instruction: str) -> str
    def embed(self, texts: list[str]) -> list[list[float]]
```

### 10.2 Structured outputs

```python
resp = client.messages.parse(model=MODEL, max_tokens=16000, system=SYSTEM,
                             messages=[{"role": "user", "content": blocks}],
                             output_format=GenerationBatch, output_config={"effort": "medium"})
batch = resp.parsed_output                       # validated GenerationBatch
```
Equivalent raw form: `output_config={"format": {"type": "json_schema", "schema": GenerationBatch.model_json_schema()}}` on `messages.create`
and `json.loads` of the first text block. Check `resp.stop_reason` first: `max_tokens` → retry with a smaller `n`; `refusal` → retry once with
`BEDROCK_FALLBACK_MODEL_ID`, then fail the job with `error='refused'`.

### 10.3 Citations and prompt caching (chat)

Context items are `document` blocks in the **first** user message, one per slide/chunk:
```python
{"type": "document",
 "source": {"type": "text", "media_type": "text/plain", "data": slide.text},
 "title": f"Lecture {lec.order_index+1} · Slide {idx+1}: {slide.title}",
 "context": f"slide_id={slide.id} lecture_id={lec.id} slide_index={idx}",
 "citations": {"enabled": True}}
```
Put `"cache_control": {"type": "ephemeral"}` on the last document block; the system prompt is static and goes first, so repeated turns on the
same thread hit the cache. Responses come back as several `text` blocks; blocks that cite carry `citations[]` with `document_index`,
`document_title`, `cited_text` and `start_char_index`/`end_char_index`. Map `document_index` → the `(slide_id, lecture_id, slide_index)` you
passed, dedupe, persist on the message and emit as `citation` SSE events. Stream with `client.messages.stream(...)`: forward `text` events
as `text` SSE deltas, then call `stream.get_final_message()` for citations and tool calls.

### 10.4 Tools (inline visual)

```python
RENDER_WIDGET = {"name": "render_widget", "strict": True,
                 "description": "Show the student an interactive widget. Use only when a visual makes the explanation clearer.",
                 "input_schema": WidgetUnion.model_json_schema()}
```
Manual loop: on `stop_reason == "tool_use"`, validate the input (`json.loads`, then `validate_widget`), insert the widget, append the assistant
content and a `tool_result` ("rendered as widget <id>"), and continue; on invalid input return `tool_result` with `is_error: true` and the errors.

### 10.5 Embeddings (`ai/embeddings.py`)

```python
body = json.dumps({"inputText": text[:20000], "dimensions": 1024, "normalize": True})
out = bedrock_runtime.invoke_model(modelId=settings.embed_model_id, body=body)   # boto3 client('bedrock-runtime')
vector = json.loads(out["body"].read())["embedding"]
```
Titan v2 takes one input per call; parallelize with a 4-thread pool. pgvector query: `ORDER BY embedding <=> :q LIMIT 12` (cosine, normalized vectors).

### 10.6 Errors and retries

Wrap every call: retry on `anthropic.RateLimitError`, `anthropic.APIStatusError` with status ≥ 500, `anthropic.APIConnectionError`, and botocore
`ThrottlingException`/`ServiceUnavailableException` with backoff 1, 2, 4, 8, 16 s (+ jitter), max 5. Anything else raises `AIError` (non-retryable).
Log `usage.input_tokens`, `usage.output_tokens`, `usage.cache_read_input_tokens` per call at `info`.

### 10.7 Prompts (`ai/prompts/*.md`)

One file per task, loaded at import time and cached: `system_course.md` (shared persona + course facts + "cite slides" rule),
`generate_items.md`, `practice.md`, `remediation.md`, `chat.md`, `concepts.md`, `classify_faq.md`, `insights.md`, `supplement.md`,
`describe_slide.md`. Keep them declarative: state the goal, the audience, the schema's meaning, and the grounding rule ("only use facts present
in the provided slides/textbook; if unsure, say so"). Avoid step-by-step micromanagement; Opus 5 does better with a clear goal.

---

## 11. Storage (`app/storage/`)

`Storage` protocol: `put(key, bytes, content_type)`, `get(key) -> bytes`, `delete(key)`, `presign_put(key, content_type) -> (url, headers)`,
`presign_get(key) -> url`. `S3Storage` uses boto3 (`generate_presigned_url` for `put_object`/`get_object`, TTL `PRESIGN_TTL_SECONDS`).
`LocalStorage` writes under `LOCAL_STORAGE_DIR`; `presign_put` returns `PUT /api/v1/uploads/local/{key}`; `presign_get` returns
`GET /api/v1/files/{key}` (dev-only router that streams the file). Key layout:

```
uploads/deck/{uuid}/{filename}         uploads/anchor/{uuid}/{filename}
lectures/{lecture_id}/slides/{0000}.jpg lectures/{lecture_id}/slides/thumb_{0000}.jpg
```

---

## 12. Seed data (`app/seed/seed.py`, `make seed`)

Idempotent. Creates course `CS106B` (Programming Abstractions, instructor `prof-demo`), users `prof-demo` (teacher), `student-demo`,
`alice`, `bob`, `chen` (students). If `app/seed/decks/*.pdf` exist, creates one published module "Seed Module" with those decks and runs
`parse_deck` + `generate_items` inline (requires Bedrock), then seeds 6 FAQ threads (2 endorsed), 3 peer submissions (one at 5 upvotes so it
sits in the review queue), a few attempts from `alice`/`bob` so the heatmap has colour. With `AI_BACKEND=fake` the same script produces
placeholder content so the UI can be exercised offline.

---

## 13. Testing (`backend/tests/`)

pytest against a real Postgres (`TEST_DATABASE_URL`, schema via Alembic, tables truncated per test), `AI_BACKEND=fake`, `STORAGE_BACKEND=local`
in a tmp dir. Required tests:

- tags: parent filling, ancestry violations → 422; filter equality semantics.
- wizard: process job tree; retry only re-runs failed children; cancel leaves inputs and parsed lectures intact; publish flips statuses.
- parse_deck on a 3-page fixture PDF: slides, thumbs, `slide_count`, idempotent re-run.
- bundle: never contains `correct_option_id`; interstitial ordering; presenter fields teacher-only.
- remediation: cache miss → 202 + job; second call → ready; concurrent misses share one job (dedupe).
- practice: target count formula; generation of shortfall via FakeAI; answers/complete/score; retake.
- promotion: 5th upvote moves to `pending_teacher_review`; un-vote does not demote; approve merges with the right `after_slide_id`.
- chat: SSE event order; citations mapped to slide ids; `render_widget` tool result persisted.
- analytics: heatmap levels from synthetic attempts; insights hash short-circuit; supplement merge inserts a slide between two `sort_key`s.
- formula evaluator: grammar accept/reject cases.
- auth: missing role → 401; student on teacher endpoint → 403.

---

## 14. AWS deployment

### 14.1 Architecture

```
Browser ──HTTP──► EC2 t3.large (Amazon Linux 2023, Docker Compose)
                  ├── api      : uvicorn :8000, published on host :80; serves /api/v1 and frontend/dist at /
                  ├── worker   : same image, python -m app.jobs.worker
                  └── postgres : pgvector/pgvector:pg16, data on the root EBS volume
                        │
          ┌─────────────┴──────────────┐
          ▼                            ▼
     S3 bucket                  Amazon Bedrock
     decks, anchors,            Claude Opus 5 (anthropic.claude-opus-5) — generation, chat, insights
     slide images               Titan Text Embeddings V2 — embeddings
```

Resources, in full: 1 EC2 instance, 1 Elastic IP, 1 security group (80 open; 22 optional by CIDR), 1 IAM role + instance profile
(`bedrock:InvokeModel*`, S3 RW on the one bucket, `AmazonSSMManagedInstanceCore`), 1 private S3 bucket with a CORS rule for presigned PUTs.
Not used, by design: RDS, SQS, Lambda, OpenSearch, Textract, ALB, CloudFront, Cognito, Caddy/nginx. HTTPS is out of scope for the demo;
if a domain is ever needed, put Caddy in front of the api container (the only change).

### 14.2 Terraform

The files in `plan/terraform/` of the planning repo are the deliverable; copy them to `infra/terraform/` in the implementation repo:
`versions.tf`, `variables.tf`, `main.tf`, `user_data.sh`, `outputs.tf`, `terraform.tfvars.example`, `check_permissions.sh`.
They reuse the default VPC, look up the AL2023 AMI via SSM, and write `/etc/keplerlearn.env` on first boot with
`AWS_REGION`, `S3_BUCKET`, `BEDROCK_MODEL_ID`, `BEDROCK_FALLBACK_MODEL_ID`, `EMBED_MODEL_ID`, `STORAGE_BACKEND=s3`, `AI_BACKEND=bedrock`,
`APP_ENV=prod`, `CORS_ORIGINS=` (same origin), and optionally clone `app_repo_url` and `docker compose up -d --build`.

**Permission gate (pending).** The target account is a Workshop Studio account (`arn:aws:sts::064917945746:assumed-role/WSParticipantRole/Participant`).
Before the first `terraform apply`, run `check_permissions.sh <profile>` with that role's temporary credentials. It dumps the role's policy
documents, simulates every action the config needs, and dry-runs the EC2 calls. Adjust per its findings:

| If the check shows | Change |
|---|---|
| Region restricted | set `aws_region` to the allowed region; confirm Bedrock lists `anthropic.claude-opus-5` there, else set `bedrock_model_id` to the best listed Anthropic model |
| Instance type/size denied | set `instance_type` to an allowed one (≥ 2 vCPU / 8 GB recommended for LibreOffice + Postgres) |
| `iam:CreateRole` / `iam:PassRole` denied | add variable `existing_instance_profile_name`; skip the IAM resources and pass the pre-created profile to `aws_instance` |
| Permissions boundary required | add `permissions_boundary = var.permissions_boundary_arn` to `aws_iam_role.app` |
| No default VPC | add `vpc_id`/`subnet_id` variables and drop the default-VPC data sources |
| `ec2:AllocateAddress` denied | remove `aws_eip`; use the instance's auto-assigned public IP (changes on stop/start) |
| Bedrock model access not granted | Console → Bedrock → Model access (manual; Terraform cannot do it) |

### 14.3 Instance runtime

`docker-compose.yml` (same file locally and in production; production uses `env_file: /etc/keplerlearn.env` via `docker-compose.prod.yml` override):

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    environment: { POSTGRES_USER: kepler, POSTGRES_PASSWORD: kepler, POSTGRES_DB: kepler }
    volumes: [ "pgdata:/var/lib/postgresql/data" ]
    healthcheck: { test: ["CMD-SHELL", "pg_isready -U kepler"], interval: 5s, retries: 20 }
  api:
    build: ./backend
    command: sh -c "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"
    env_file: [ .env ]
    environment: { DATABASE_URL: "postgresql+psycopg://kepler:kepler@postgres:5432/kepler", FRONTEND_DIST: /srv/frontend }
    volumes: [ "./frontend/dist:/srv/frontend:ro" ]
    ports: [ "80:8000" ]
    depends_on: { postgres: { condition: service_healthy } }
  worker:
    build: ./backend
    command: python -m app.jobs.worker
    env_file: [ .env ]
    environment: { DATABASE_URL: "postgresql+psycopg://kepler:kepler@postgres:5432/kepler" }
    depends_on: { postgres: { condition: service_healthy } }
volumes: { pgdata: {} }
```

`backend/Dockerfile`: `python:3.12-slim`, `apt-get install --no-install-recommends libreoffice-impress fonts-dejavu`, `uv sync --frozen`,
non-root user, `WORKDIR /app`. Expect a ~1.5 GB image because of LibreOffice; acceptable for one instance.

### 14.4 Runbook

1. `cd infra/terraform && cp terraform.tfvars.example terraform.tfvars`; set `aws_region` and, if wanted, `ssh_cidr`/`ssh_key_name`, `app_repo_url`.
2. `./check_permissions.sh <profile>` → apply the table in 14.2 if anything fails.
3. `terraform init && terraform apply`. Note `public_ip`, `assets_bucket`, `ssm_connect` outputs.
4. If `app_repo_url` was not set: `aws ssm start-session --target <instance_id>`, `git clone` to `/opt/keplerlearn`, `cp /etc/keplerlearn.env .env`,
   build the frontend into `frontend/dist` (or `scp` a prebuilt one), `docker compose up -d --build`, `docker compose exec api python -m app.seed.seed`.
5. Open `http://<public_ip>/`. `GET /healthz` must return `{"ok": true}`.
6. Cost: ~$2/day for `t3.large` while running, plus ~$0.12/day for the public IPv4 address whether the instance is running or not. Stop the instance between sessions; the Elastic IP keeps the same address.

---

## 15. Contract for the frontend plan

The frontend plan will assume exactly this:

- Base URL `/api/v1`, OpenAPI at `/api/v1/openapi.json`; dev server on `http://localhost:5173` talks to `http://localhost:8000` with CORS.
- Headers `X-Demo-Role` (required) and `X-Demo-User` (optional) on every request; role toggle is client state.
- Uploads: presign → `PUT` the file to `upload_url` with the returned headers → pass `key` to the create endpoint.
- Long operations return `{job_id}` (`202`); poll `GET /jobs/{id}` at 1 s; wizard polls `GET /modules/{id}/process` at 1.5 s.
- Chat uses SSE (`POST` with `fetch` + `ReadableStream`; events in 7.10).
- Widgets are rendered from the JSON in section 9 by one `<WidgetRenderer>`; the slider grammar in 9.1 is implemented client-side.
- Slide positions are ids; `index` in responses is display-only.
- Errors are `{error: {code, message}}`; `401` = pick a role, `403` = wrong role.
- In production the same origin serves `/` (built app) and `/api/v1`.

---

## 16. Build order and acceptance

| Milestone | Delivers | Done when |
|---|---|---|
| M0 Skeleton | repo layout, settings, DB + migration 0001, auth dep, `/healthz`, `/me`, `/course`, seed users, compose up locally | tests for auth pass; `docker compose up` serves `/healthz` |
| M1 Modules | 7.2 + 7.3 + storage backends + jobs queue/worker + `parse_deck`/`index_anchor` + 7.4 without generation | upload a PDF deck via the API, see slides in `GET /lectures/{id}/bundle` |
| M2 Generation | Bedrock client, widget schemas + validation, `generate_items`, review, publish | wizard end-to-end with `AI_BACKEND=bedrock`; bundle shows interstitials |
| M3 Learning | progress, quiz-answers, `generate_remediation` + cache, feedback, publish widget | wrong answer → 202 → widget within ~15 s; second student gets it instantly |
| M4 Practice | 7.7 + practice generation | session with mixed lectures; per-row explain/answer |
| M5 Community | 7.8, 7.9, promotion, review queue, `classify_faq` | 5th upvote lands in `/review-queue`; approve → appears in bundle |
| M6 Chat | 7.10 with citations, retrieval, inline widget, escalate, quiz-from-chat | citations deep-link to real slide ids |
| M7 Analytics | 7.11 + insights + supplements + 7.12 | heatmap colours from seeded attempts; supplement merged into bundle order |
| M8 Deploy | Terraform apply in the workshop account, compose on the instance, seed | demo reachable on the public IP |

Each milestone adds its tests from section 13 and updates `README.md` (run, seed, env vars).
