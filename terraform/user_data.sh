#!/bin/bash
set -euxo pipefail

# --- Docker + Compose plugin + git on Amazon Linux 2023 ---------------------
dnf install -y docker git
systemctl enable --now docker
usermod -aG docker ec2-user

COMPOSE_VERSION="v2.29.7"
mkdir -p /usr/local/lib/docker/cli-plugins
curl -fsSL "https://github.com/docker/compose/releases/download/$${COMPOSE_VERSION}/docker-compose-linux-x86_64" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# --- App environment (read by docker compose via env_file) ------------------
cat > /etc/keplerlearn.env <<ENV
AWS_REGION=${aws_region}
AWS_DEFAULT_REGION=${aws_region}
S3_BUCKET=${s3_bucket}
BEDROCK_MODEL_ID=${bedrock_model_id}
BEDROCK_FALLBACK_MODEL_ID=${bedrock_fallback_model_id}
EMBED_MODEL_ID=${embed_model_id}
STORAGE_BACKEND=s3
AI_BACKEND=bedrock
APP_ENV=prod
CORS_ORIGINS=
ENV
chmod 644 /etc/keplerlearn.env

# --- Optional: clone and start the app ---------------------------------------
%{ if app_repo_url != "" ~}
git clone "${app_repo_url}" /opt/keplerlearn
chown -R ec2-user:ec2-user /opt/keplerlearn
cd /opt/keplerlearn
cp /etc/keplerlearn.env .env
docker compose up -d --build
%{ else ~}
echo "No app_repo_url set. Clone the repo to /opt/keplerlearn, cp /etc/keplerlearn.env .env, then: docker compose up -d --build"
%{ endif ~}
