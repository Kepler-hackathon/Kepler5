# KeplerLearn infrastructure (AWS CDK)

Implements [`docs/backend-plan.md`](../docs/backend-plan.md) §3, §4, §6, §8, §12, §13 as one CDK stack, `KeplerStack`, in **us-east-1**.

| Construct | Plan section | What it creates |
|---|---|---|
| `Network` | §13, B15 | VPC (2 AZ), 1 NAT gateway, S3 gateway endpoint, public / private / isolated subnets |
| `Data` | §5, B4 | Aurora Serverless v2 PostgreSQL 16 (`kepler` db), Secrets Manager credentials, security group |
| `Storage` | §6 | `uploads` bucket (presigned PUT, CORS, `tmp/` 1-day expiry) and `assets` bucket (CloudFront only) |
| `Jobs` | §8, §9.1 | SQS jobs queue + DLQ, `generator` Lambda (Node, SQS-triggered), `deck-parser` Lambda (container), Step Functions `kepler-process-module` |
| `App` | §4, B1 | ECS Fargate service for `apps/web` behind an ALB, autoscaling 1–3, health check `/api/health`, task role (Bedrock, S3, SQS, Step Functions, secret) |
| `Edge` | §4, §6, §11 | CloudFront (ALB origin + `/assets/*` S3 origin with OAC), WAF rate limit + common rules |
| `Ops` | §12, §13 | CloudWatch alarms → SNS, optional GitHub OIDC deploy role |

Bedrock itself is not a CloudFormation resource: **model access must be enabled in the Bedrock console** for Claude Sonnet 5, Claude Haiku 4.5, and Titan Text Embeddings V2 in us-east-1 before the first request, and the Sonnet quota increase requested (plan §7.2, §17 step 0).

## Prerequisites

- Node 22, Docker (image assets are built at deploy time), AWS CLI v2
- Credentials for an IAM principal that can run CloudFormation, IAM, VPC, RDS, ECS, Lambda, S3, CloudFront, WAF, SQS, Step Functions, Secrets Manager. (The `trainium-user` key found on the dev machine cannot — it has no CloudFormation or Bedrock permissions.)

## Commands

```bash
cd infra
npm install
npm run typecheck
npm run synth                       # no AWS calls needed
npx cdk bootstrap aws://<account>/us-east-1   # once per account/region
npm run deploy                      # ~20 min the first time (Aurora + CloudFront)
bash scripts/migrate.sh             # one-off ECS task; wire to drizzle-kit in build step 1
```

Context knobs (`cdk.json` or `-c key=value`):

| Key | Default | Meaning |
|---|---|---|
| `minAcu` | `0.5` | Aurora floor. `0` enables scale-to-zero (≈15 s resume on first connection — keep 0.5 during demos) |
| `maxAcu` | `2` | Aurora ceiling |
| `wafRateLimit` | `300` | Requests / 5 min / IP before WAF blocks |
| `alarmEmail` | `""` | Subscribe an address to the alarm topic |
| `githubRepo` | `""` | `owner/repo`; when set, creates the OIDC role used by `.github/workflows/deploy.yml` |

## What is deliberately not here

- No custom domain / ACM certificate: CloudFront serves on its default hostname over HTTPS, and talks to the ALB over HTTP inside AWS.
- No RDS Proxy, no ElastiCache, no VPC interface endpoints (plan §14.13 rows 174–175; add when evidence says so).
- No Bedrock Knowledge Base or DynamoDB: the plan (B5) uses `pgvector` in Aurora. `docs/backend/ingestion.md` proposes the other path; it was not adopted here.

## Tearing down

`npm run destroy` removes everything including bucket contents and the database (RemovalPolicy DESTROY, hackathon setting).
