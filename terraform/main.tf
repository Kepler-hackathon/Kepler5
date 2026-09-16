# ---------------------------------------------------------------------------
# Network: reuse the account's default VPC. No new VPC, NAT or load balancer.
# ---------------------------------------------------------------------------
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

data "aws_ssm_parameter" "al2023_ami" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
}

data "aws_caller_identity" "current" {}

resource "aws_security_group" "app" {
  name        = "${var.project}-app"
  description = "KeplerLearn single-instance app"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "HTTP (api container publishes host port 80)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  dynamic "ingress" {
    for_each = var.ssh_cidr == "" ? [] : [var.ssh_cidr]
    content {
      description = "SSH"
      from_port   = 22
      to_port     = 22
      protocol    = "tcp"
      cidr_blocks = [ingress.value]
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project}-app" }
}

# ---------------------------------------------------------------------------
# Storage: one private bucket for decks, textbook/problem-bank PDFs and
# rendered slide images. The browser uploads and reads via presigned URLs.
# ---------------------------------------------------------------------------
resource "aws_s3_bucket" "assets" {
  bucket        = "${var.project}-assets-${data.aws_caller_identity.current.account_id}"
  force_destroy = true

  tags = { Name = "${var.project}-assets" }
}

resource "aws_s3_bucket_public_access_block" "assets" {
  bucket                  = aws_s3_bucket.assets.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_cors_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3600
  }
}

# ---------------------------------------------------------------------------
# IAM: the instance role is the only credential the app ever uses.
#   - Bedrock invoke (Claude via Mantle endpoint + Titan embeddings)
#   - read/write on the assets bucket
#   - SSM Session Manager so SSH can stay closed
# ---------------------------------------------------------------------------
data "aws_iam_policy_document" "assume_ec2" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "app" {
  name               = "${var.project}-app"
  assume_role_policy = data.aws_iam_policy_document.assume_ec2.json
}

data "aws_iam_policy_document" "app" {
  statement {
    sid = "Bedrock"
    actions = [
      "bedrock:InvokeModel",
      "bedrock:InvokeModelWithResponseStream",
    ]
    # Model ARNs and cross-region inference profiles vary by region;
    # "*" keeps this portable. Tighten to specific model ARNs if desired.
    resources = ["*"]
  }

  statement {
    sid = "AssetsBucket"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:ListBucket",
    ]
    resources = [
      aws_s3_bucket.assets.arn,
      "${aws_s3_bucket.assets.arn}/*",
    ]
  }
}

resource "aws_iam_role_policy" "app" {
  name   = "${var.project}-app"
  role   = aws_iam_role.app.id
  policy = data.aws_iam_policy_document.app.json
}

resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.app.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "app" {
  name = "${var.project}-app"
  role = aws_iam_role.app.name
}

# ---------------------------------------------------------------------------
# Compute: one instance running Docker Compose (caddy, api, worker, postgres).
# ---------------------------------------------------------------------------
resource "aws_instance" "app" {
  ami                         = data.aws_ssm_parameter.al2023_ami.value
  instance_type               = var.instance_type
  subnet_id                   = data.aws_subnets.default.ids[0]
  vpc_security_group_ids      = [aws_security_group.app.id]
  iam_instance_profile        = aws_iam_instance_profile.app.name
  key_name                    = var.ssh_cidr == "" ? null : var.ssh_key_name
  associate_public_ip_address = true

  root_block_device {
    volume_size = var.root_volume_gb
    volume_type = "gp3"
  }

  metadata_options {
    http_tokens = "required" # IMDSv2; boto3 and the Anthropic SDK support it
  }

  user_data = templatefile("${path.module}/user_data.sh", {
    aws_region                = var.aws_region
    s3_bucket                 = aws_s3_bucket.assets.bucket
    bedrock_model_id          = var.bedrock_model_id
    bedrock_fallback_model_id = var.bedrock_fallback_model_id
    embed_model_id            = var.embed_model_id
    app_repo_url              = var.app_repo_url
  })
  user_data_replace_on_change = true

  tags = { Name = "${var.project}-app" }
}

resource "aws_eip" "app" {
  instance = aws_instance.app.id
  domain   = "vpc"

  tags = { Name = "${var.project}-app" }
}
