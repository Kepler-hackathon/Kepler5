# backend-plan.md §9.1: deck-parser Lambda container.
# Debian base + Lambda Runtime Interface Client instead of the AWS Python base image, because
# LibreOffice is not packaged for Amazon Linux 2023 and apt gives a reproducible install.
FROM --platform=linux/arm64 python:3.12-slim-bookworm

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HOME=/tmp \
    LAMBDA_TASK_ROOT=/var/task

RUN apt-get update && apt-get install -y --no-install-recommends \
      libreoffice-impress libreoffice-writer \
      fonts-dejavu-core fonts-liberation fonts-noto-cjk \
      ca-certificates \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR ${LAMBDA_TASK_ROOT}
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY handler.py .

ENTRYPOINT ["python", "-m", "awslambdaric"]
CMD ["handler.handler"]
