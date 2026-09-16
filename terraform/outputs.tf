output "public_ip" {
  description = "Open http://<public_ip> once docker compose is up."
  value       = aws_eip.app.public_ip
}

output "instance_id" {
  value = aws_instance.app.id
}

output "assets_bucket" {
  value = aws_s3_bucket.assets.bucket
}

output "ssm_connect" {
  description = "Shell into the instance without SSH."
  value       = "aws ssm start-session --region ${var.aws_region} --target ${aws_instance.app.id}"
}
