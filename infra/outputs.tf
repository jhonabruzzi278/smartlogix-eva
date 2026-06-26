output "ecr_base_url" {
  description = "Base URL for ECR repositories"
  value       = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${data.aws_region.current.name}.amazonaws.com/${var.project_name}"
}

output "ecr_repositories" {
  description = "ECR repository URLs"
  value       = { for k, v in aws_ecr_repository.services : k => v.repository_url }
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "cloudmap_namespace" {
  description = "CloudMap private DNS namespace"
  value       = aws_service_discovery_private_dns_namespace.main.name
}

output "efs_id" {
  description = "EFS file system ID for PostgreSQL data"
  value       = aws_efs_file_system.postgres.id
}

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "nginx_service_name" {
  description = "Run this after deploy to get the nginx public IP"
  value       = "aws ecs list-tasks --cluster ${aws_ecs_cluster.main.name} --service-name nginx --query 'taskArns[0]' --output text | xargs -I{} aws ecs describe-tasks --cluster ${aws_ecs_cluster.main.name} --tasks {} --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' --output text | xargs -I{} aws ec2 describe-network-interfaces --network-interface-ids {} --query 'NetworkInterfaces[0].Association.PublicIp' --output text"
}
