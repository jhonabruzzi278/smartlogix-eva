variable "aws_region" {
  description = "AWS region where resources are created."
  type        = string
}

variable "project_name" {
  description = "Project name used to build resource names and tags."
  type        = string
}

variable "environment" {
  description = "Environment name used to build resource names and tags."
  type        = string
}

variable "owner_name" {
  description = "Owner name applied to resources through default provider tags."
  type        = string
}

variable "aws_profile" {
  description = "AWS CLI profile for local use. Leave empty in CI/CD (uses env credentials)."
  type        = string
  default     = ""
}

variable "vpc_cidr" {
  description = "CIDR block for VPC."
  type        = string
  default     = "10.0.0.0/16"
}

variable "db_password" {
  description = "PostgreSQL password"
  sensitive   = true
}

variable "smtp_host" {
  description = "SMTP host"
  default     = "smtp.gmail.com"
}

variable "smtp_port" {
  description = "SMTP port"
  default     = "587"
}

variable "smtp_user" {
  description = "SMTP username"
  sensitive   = true
}

variable "smtp_pass" {
  description = "SMTP password (App Password)"
  sensitive   = true
}

variable "smtp_from" {
  description = "SMTP from address"
  sensitive   = true
}

variable "app_url" {
  description = "Public URL of the application (nginx public IP)"
  default     = "http://localhost"
}
