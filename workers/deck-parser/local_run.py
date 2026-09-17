"""Local invocation shim for handler.py — no Docker, no Lambda runtime.

Reads a JSON event from stdin, calls the real handler.handler(event, None), and prints the
JSON result to stdout. Used by apps/web/src/lib/local-worker.ts when LOCAL_WORKERS=true, so
the deck-parser code runs as a plain local Python process instead of inside its Lambda
container image. Needs DATABASE_URL plus AWS credentials/region for S3 + Bedrock (real AWS,
per the project's decision not to run LocalStack — see docs/backend/backend-plan.md §13).
"""
import contextlib
import json
import sys

from handler import handler


def main() -> None:
    event = json.loads(sys.stdin.read())
    # handler.py logs progress via print() (CloudWatch log lines in real Lambda) — redirect
    # those to stderr so stdout carries only the final JSON result local-worker.ts parses.
    with contextlib.redirect_stdout(sys.stderr):
        result = handler(event, None)
    print(json.dumps(result))


if __name__ == '__main__':
    main()
