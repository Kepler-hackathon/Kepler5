"""
deck-parser Lambda — backend-plan.md §9.1.

Two tasks, both invoked by the process-module state machine (infra/lib/constructs/jobs.ts):

  {"task": "parse",         "runId", "moduleId", "lectureId"}   PPTX/PDF → slides (images + text + notes)
  {"task": "ingestAnchors", "runId", "moduleId"}                 textbook / problem bank → kb_chunks

This is the infrastructure scaffold. It proves the container has LibreOffice, PyMuPDF,
python-pptx and boto3 available and echoes the contract; build step 5 (plan §17) fills in the
pipeline. Raise ParseTransientError for retryable failures — the state machine retries on
that exact error name (jobs.ts) and treats anything else as a per-lecture failure.
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess


class ParseTransientError(Exception):
    """Retryable (network, S3 hiccup, LibreOffice crash). Matched by name in Step Functions."""


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


def parse(event: dict) -> dict:
    lecture_id = event["lectureId"]
    # TODO(build step 5): download deck, sniff magic bytes, PPTX→PDF via soffice (300 s timeout),
    # text+notes via python-pptx / PyMuPDF, render WebP (1600 px + 320 px thumb) to
    # ASSETS_BUCKET, OCR pages with <20 chars via Textract (cap 60), upsert slides in one
    # transaction, set parse_status='parsed'. Skip immediately if already parsed (§8.3).
    return {"status": "stub", "lectureId": lecture_id, "probe": _probe()}


def ingest_anchors(event: dict) -> dict:
    module_id = event["moduleId"]
    # TODO(build step 5): per-page text → ~800-token chunks → Titan Embeddings V2 → kb_chunks,
    # upsert by (anchor_id, page_from, page_to) so retries only embed what is missing (§14.2 row 32).
    return {"status": "stub", "moduleId": module_id}


def handler(event: dict, _context) -> dict:
    task = event.get("task")
    print(json.dumps({"msg": "deck-parser invoked", "task": task, "runId": event.get("runId")}))
    if task == "parse":
        return parse(event)
    if task == "ingestAnchors":
        return ingest_anchors(event)
    raise ValueError(f"unknown task: {task}")
