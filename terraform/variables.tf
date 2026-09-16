variable "aws_region" {
  description = "Region for all resources. Must have Bedrock with Claude and Titan Embeddings (us-east-1, us-west-2, eu-central-1, ...)."
  type        = string
  default     = "us-east-1"
}

variable "project" {
  description = "Name prefix for every resource."
  type        = string
  default     = "keplerlearn"
}

variable "instance_type" {
  description = "EC2 instance type. Postgres, API, worker, LibreOffice and Caddy all run here."
  type        = string
  default     = "t3.large"
}

variable "root_volume_gb" {
  description = "Root EBS size. Holds Postgres data, Docker images and LibreOffice."
  type        = number
  default     = 60
}

variable "ssh_cidr" {
  description = "CIDR allowed to SSH (port 22). Leave empty to close SSH and use SSM Session Manager instead."
  type        = string
  default     = ""
}

variable "ssh_key_name" {
  description = "Existing EC2 key pair name. Only used when ssh_cidr is set."
  type        = string
  default     = ""
}

variable "bedrock_model_id" {
  description = "Bedrock model id passed to the Anthropic Mantle client."
  type        = string
  default     = "anthropic.claude-opus-5"
}

variable "bedrock_fallback_model_id" {
  description = "Fallback model for client-side refusal fallback middleware."
  type        = string
  default     = "anthropic.claude-opus-4-8"
}

variable "embed_model_id" {
  description = "Bedrock embeddings model id."
  type        = string
  default     = "amazon.titan-embed-text-v2:0"
}

variable "app_repo_url" {
  description = "Optional git URL of the app repo. If set, user_data clones it to /opt/keplerlearn and runs docker compose up."
  type        = string
  default     = ""
}
