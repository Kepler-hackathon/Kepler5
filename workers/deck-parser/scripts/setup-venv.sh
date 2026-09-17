#!/usr/bin/env bash
# One-time setup for running the deck-parser handler locally via local_run.py (no Docker,
# no Lambda). LibreOffice from the Lambda Dockerfile isn't needed here: parse()/ingest_anchors()
# extract text via python-pptx/PyMuPDF directly — soffice is only touched by the unused
# _probe() health check.
set -euo pipefail
cd "$(dirname "$0")/.."

python3 -m venv .venv
.venv/bin/pip install --upgrade pip
.venv/bin/pip install -r requirements.txt

echo "Done. Run tasks with: .venv/bin/python3 local_run.py < events/parse.json"
