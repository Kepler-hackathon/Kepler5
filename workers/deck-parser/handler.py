"""
deck-parser Lambda — backend-plan.md §9.1.

Two tasks, both invoked by the process-module state machine (infra/lib/constructs/jobs.ts):

  {"task": "parse",         "runId", "moduleId", "lectureId"}   PPTX/PDF → slides (text + notes)
  {"task": "ingestAnchors", "runId", "moduleId"}                 textbook / problem bank → kb_chunks

Raise ParseTransientError for retryable failures — the state machine retries on that exact error
name (jobs.ts) and treats anything else as a per-lecture failure.
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import uuid
from pathlib import Path
from typing import Any


# ─── Errors ──────────────────────────────────────────────────────────────────

class ParseTransientError(Exception):
    """Retryable (network, S3 hiccup, LibreOffice crash). Matched by name in Step Functions."""


# ─── DB connection ────────────────────────────────────────────────────────────

def _get_db_url() -> str:
    if url := os.environ.get("DATABASE_URL"):
        return url
    import boto3
    sm = boto3.client("secretsmanager", region_name=os.environ.get("AWS_REGION", "us-east-1"))
    secret = json.loads(sm.get_secret_value(SecretId=os.environ["DB_SECRET_ARN"])["SecretString"])
    host = secret["host"]
    port = secret.get("port", 5432)
    user = secret["username"]
    pwd = secret["password"]
    db = os.environ.get("DB_NAME", "kepler")
    return f"host={host} port={port} dbname={db} user={user} password={pwd} sslmode=require"


def _connect():
    import psycopg
    return psycopg.connect(_get_db_url())


# ─── S3 helpers ───────────────────────────────────────────────────────────────

def _s3():
    import boto3
    return boto3.client("s3")


UPLOADS_BUCKET = os.environ.get("UPLOADS_BUCKET", "")
ASSETS_BUCKET = os.environ.get("ASSETS_BUCKET", "")


# ─── Probe (container health check) ──────────────────────────────────────────

def _soffice_version() -> str | None:
    exe = shutil.which("soffice") or shutil.which("libreoffice")
    if not exe:
        return None
    try:
        out = subprocess.run([exe, "--version"], capture_output=True, text=True, timeout=60)
        return out.stdout.strip() or None
    except Exception as exc:  # noqa: BLE001
        return f"error: {exc}"


def _probe() -> dict:
    import boto3  # noqa: F401
    import fitz  # PyMuPDF
    import pptx

    return {
        "pymupdf": fitz.__doc__.split()[1] if fitz.__doc__ else "ok",
        "python_pptx": pptx.__version__,
        "soffice": _soffice_version(),
        "home_writable": os.access(os.environ.get("HOME", "/tmp"), os.W_OK),
    }


# ─── Slide extraction helpers ─────────────────────────────────────────────────

def _extract_pptx_slides(path: str) -> list[dict]:
    from pptx import Presentation

    prs = Presentation(path)
    slides = []
    for i, slide in enumerate(prs.slides):
        text_parts = []
        for shape in slide.shapes:
            if hasattr(shape, "text") and shape.text.strip():
                text_parts.append(shape.text.strip())
        text = "\n".join(text_parts)
        notes = ""
        if slide.has_notes_slide:
            notes = slide.notes_slide.notes_text_frame.text.strip()
        title = ""
        if slide.shapes.title and slide.shapes.title.text:
            title = slide.shapes.title.text.strip()
        if not title:
            title = f"Slide {i + 1}"
        slides.append({"index": i, "title": title, "text": text, "notes": notes})
    return slides


def _extract_pdf_pages(path: str) -> list[dict]:
    import fitz

    doc = fitz.open(path)
    pages = []
    for i in range(len(doc)):
        text = doc[i].get_text()
        pages.append({"index": i, "title": f"Page {i + 1}", "text": text, "notes": ""})
    return pages


# ─── Chunking ─────────────────────────────────────────────────────────────────

def _chunk_pages(pages: list[dict], max_words: int = 600) -> list[dict[str, Any]]:
    chunks: list[dict[str, Any]] = []
    current_words: list[str] = []
    current_pages: set[int] = set()

    for pg in pages:
        words = pg["text"].split()
        if not words:
            continue
        if len(current_words) + len(words) > max_words and current_words:
            chunks.append({
                "text": " ".join(current_words),
                "page_from": min(current_pages),
                "page_to": max(current_pages),
            })
            current_words, current_pages = [], set()
        current_words.extend(words)
        current_pages.add(pg["index"])

    if current_words:
        chunks.append({
            "text": " ".join(current_words),
            "page_from": min(current_pages),
            "page_to": max(current_pages),
        })
    return chunks


# ─── Bedrock embeddings ───────────────────────────────────────────────────────

def _embed(text: str) -> list[float]:
    import boto3

    bedrock = boto3.client("bedrock-runtime", region_name=os.environ.get("AWS_REGION", "us-east-1"))
    model_id = os.environ.get("BEDROCK_EMBED_MODEL", "amazon.titan-embed-text-v2:0")
    resp = bedrock.invoke_model(
        modelId=model_id,
        contentType="application/json",
        accept="application/json",
        body=json.dumps({"inputText": text[:8000], "dimensions": 1024, "normalize": True}),
    )
    return json.loads(resp["body"].read())["embedding"]


def _vec_str(embedding: list[float]) -> str:
    return "[" + ",".join(str(x) for x in embedding) + "]"


# ─── parse task ───────────────────────────────────────────────────────────────

def parse(event: dict) -> dict:
    run_id = event["runId"]
    lecture_id = event["lectureId"]
    local_path = f"/tmp/deck_{lecture_id}"

    try:
        with _connect() as conn:
            # 1. Load lecture — skip if already parsed (idempotent)
            row = conn.execute(
                "SELECT parse_status, deck_file_id FROM lectures WHERE id = %s",
                (lecture_id,),
            ).fetchone()
            if row is None:
                raise ValueError(f"lecture {lecture_id} not found")
            parse_status, deck_file_id = row
            if parse_status == "parsed":
                return {"status": "already_parsed", "lectureId": lecture_id}

            # 2. No deck file
            if deck_file_id is None:
                conn.execute(
                    "UPDATE lectures SET parse_status='failed', parse_error=%s WHERE id=%s",
                    ("no deck file", lecture_id),
                )
                conn.execute(
                    "UPDATE lecture_processing SET parse_status='failed', parse_error=%s "
                    "WHERE run_id=%s AND lecture_id=%s",
                    ("no deck file", run_id, lecture_id),
                )
                conn.commit()
                return {"status": "no_deck", "lectureId": lecture_id}

            # 3. Get S3 key
            file_row = conn.execute(
                "SELECT key, mime FROM files WHERE id = %s",
                (deck_file_id,),
            ).fetchone()
            if file_row is None:
                raise ValueError(f"file {deck_file_id} not found")
            s3_key, mime = file_row

            # 4. Mark running
            conn.execute(
                "UPDATE lecture_processing SET parse_status='running', parse_attempts=parse_attempts+1 "
                "WHERE run_id=%s AND lecture_id=%s",
                (run_id, lecture_id),
            )
            conn.execute(
                "UPDATE lectures SET parse_status='extracting' WHERE id=%s",
                (lecture_id,),
            )
            conn.commit()

        # 5. Download from S3
        try:
            _s3().download_file(UPLOADS_BUCKET, s3_key, local_path)
        except Exception as exc:
            raise ParseTransientError(f"S3 download failed: {exc}") from exc

        # 6. Extract slides
        is_pptx = mime in ("application/vnd.openxmlformats-officedocument.presentationml.presentation",
                           "application/vnd.ms-powerpoint") or local_path.endswith(".pptx")
        if is_pptx:
            slides_data = _extract_pptx_slides(local_path)
        else:
            slides_data = _extract_pdf_pages(local_path)

        # 7–9. Write slides and update status in one transaction
        with _connect() as conn:
            now_sql = "NOW()"
            for slide in slides_data:
                slide_id = str(uuid.uuid4())
                conn.execute(
                    """
                    INSERT INTO slides (id, lecture_id, index, text, notes, text_source, created_at)
                    VALUES (%s, %s, %s, %s, %s, 'pptx', NOW())
                    ON CONFLICT ON CONSTRAINT slides_orig
                    DO UPDATE SET text = EXCLUDED.text, notes = EXCLUDED.notes
                    """,
                    (slide_id, lecture_id, slide["index"], slide["text"], slide["notes"]),
                )

            n = len(slides_data)
            conn.execute(
                "UPDATE lectures SET parse_status='parsed', slide_count=%s WHERE id=%s",
                (n, lecture_id),
            )
            conn.execute(
                "UPDATE lecture_processing SET parse_status='done' WHERE run_id=%s AND lecture_id=%s",
                (run_id, lecture_id),
            )
            conn.commit()

        return {"status": "ok", "lectureId": lecture_id, "slideCount": len(slides_data)}

    except ParseTransientError:
        _mark_parse_failed(run_id, lecture_id, "transient error — retrying")
        raise
    except Exception as exc:
        _mark_parse_failed(run_id, lecture_id, str(exc))
        raise
    finally:
        if Path(local_path).exists():
            Path(local_path).unlink(missing_ok=True)


def _mark_parse_failed(run_id: str, lecture_id: str, error: str) -> None:
    try:
        with _connect() as conn:
            conn.execute(
                "UPDATE lectures SET parse_status='failed', parse_error=%s WHERE id=%s",
                (error[:2000], lecture_id),
            )
            conn.execute(
                "UPDATE lecture_processing SET parse_status='failed', parse_error=%s "
                "WHERE run_id=%s AND lecture_id=%s",
                (error[:2000], run_id, lecture_id),
            )
            conn.commit()
    except Exception:  # noqa: BLE001
        pass  # best-effort; original exception propagates


# ─── ingestAnchors task ───────────────────────────────────────────────────────

def ingest_anchors(event: dict) -> dict:
    module_id = event["moduleId"]

    if os.environ.get("AI_DISABLED", "false").lower() == "true":
        return {"status": "skipped", "reason": "AI_DISABLED", "moduleId": module_id}

    with _connect() as conn:
        anchors = conn.execute(
            "SELECT ka.id, ka.file_id, ka.kind FROM knowledge_anchors ka "
            "WHERE ka.module_id = %s AND ka.ingest_status != 'done'",
            (module_id,),
        ).fetchall()

    if not anchors:
        return {"status": "ok", "moduleId": module_id, "anchorsProcessed": 0}

    processed = 0
    for anchor_id, file_id, kind in anchors:
        local_path = f"/tmp/anchor_{anchor_id}"
        try:
            _ingest_one_anchor(module_id, anchor_id, file_id, kind, local_path)
            processed += 1
        except Exception as exc:  # noqa: BLE001
            print(json.dumps({"msg": "anchor ingest failed", "anchorId": anchor_id, "error": str(exc)}))
            try:
                with _connect() as conn:
                    conn.execute(
                        "UPDATE knowledge_anchors SET ingest_status='failed', error=%s WHERE id=%s",
                        (str(exc)[:2000], anchor_id),
                    )
                    conn.commit()
            except Exception:  # noqa: BLE001
                pass
        finally:
            Path(local_path).unlink(missing_ok=True)

    return {"status": "ok", "moduleId": module_id, "anchorsProcessed": processed}


def _ingest_one_anchor(module_id: str, anchor_id: str, file_id: str, kind: str, local_path: str) -> None:
    # Get S3 key
    with _connect() as conn:
        file_row = conn.execute("SELECT key, mime FROM files WHERE id=%s", (file_id,)).fetchone()
    if file_row is None:
        raise ValueError(f"file {file_id} not found")
    s3_key, mime = file_row

    # Download
    try:
        _s3().download_file(UPLOADS_BUCKET, s3_key, local_path)
    except Exception as exc:
        raise ParseTransientError(f"S3 download failed: {exc}") from exc

    # Extract pages
    is_pptx = mime in ("application/vnd.openxmlformats-officedocument.presentationml.presentation",
                       "application/vnd.ms-powerpoint") or local_path.endswith(".pptx")
    if is_pptx:
        pages = _extract_pptx_slides(local_path)
    else:
        pages = _extract_pdf_pages(local_path)

    page_count = len(pages)
    chunks = _chunk_pages(pages)

    with _connect() as conn:
        chunk_count = 0
        for chunk in chunks:
            if not chunk["text"].strip():
                continue
            embedding = _embed(chunk["text"])
            vec = _vec_str(embedding)
            token_count = len(chunk["text"].split())
            chunk_id = str(uuid.uuid4())
            conn.execute(
                """
                INSERT INTO kb_chunks
                  (id, anchor_id, module_id, page_from, page_to, text, token_count, embedding)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s::vector)
                ON CONFLICT (anchor_id, page_from, page_to)
                DO UPDATE SET
                  text = EXCLUDED.text,
                  embedding = EXCLUDED.embedding,
                  token_count = EXCLUDED.token_count
                """,
                (chunk_id, anchor_id, module_id,
                 chunk["page_from"], chunk["page_to"],
                 chunk["text"], token_count, vec),
            )
            chunk_count += 1

        conn.execute(
            "UPDATE knowledge_anchors SET ingest_status='done', chunk_count=%s, page_count=%s WHERE id=%s",
            (chunk_count, page_count, anchor_id),
        )
        conn.commit()


# ─── Entry point ─────────────────────────────────────────────────────────────

def handler(event: dict, _context) -> dict:
    task = event.get("task")
    print(json.dumps({"msg": "deck-parser invoked", "task": task, "runId": event.get("runId")}))
    if task == "parse":
        return parse(event)
    if task == "ingestAnchors":
        return ingest_anchors(event)
    raise ValueError(f"unknown task: {task}")
