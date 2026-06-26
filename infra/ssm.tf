resource "aws_ssm_parameter" "smtp_host" {
  name  = "/${var.project_name}/smtp_host"
  type  = "String"
  value = var.smtp_host
}

resource "aws_ssm_parameter" "smtp_port" {
  name  = "/${var.project_name}/smtp_port"
  type  = "String"
  value = var.smtp_port
}

resource "aws_ssm_parameter" "smtp_user" {
  name  = "/${var.project_name}/smtp_user"
  type  = "SecureString"
  value = var.smtp_user
}

resource "aws_ssm_parameter" "smtp_pass" {
  name  = "/${var.project_name}/smtp_pass"
  type  = "SecureString"
  value = var.smtp_pass
}

resource "aws_ssm_parameter" "smtp_from" {
  name  = "/${var.project_name}/smtp_from"
  type  = "String"
  value = var.smtp_from
}

resource "aws_ssm_parameter" "app_url" {
  name  = "/${var.project_name}/app_url"
  type  = "String"
  value = var.app_url
}

resource "aws_ssm_parameter" "db_password" {
  name  = "/${var.project_name}/db_password"
  type  = "SecureString"
  value = var.db_password
}
