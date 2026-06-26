resource "aws_service_discovery_private_dns_namespace" "main" {
  name = "${var.project_name}.local"
  vpc  = aws_vpc.main.id
  tags = { Name = "${var.project_name}-namespace" }
}

locals {
  discovery_services = [
    "orders-service",
    "inventory-service",
    "shipping-service",
    "notification-service",
    "postgres-db",
  ]
}

resource "aws_service_discovery_service" "main" {
  for_each = toset(local.discovery_services)
  name     = each.key

  dns_config {
    namespace_id   = aws_service_discovery_private_dns_namespace.main.id
    routing_policy = "MULTIVALUE"
    dns_records {
      ttl  = 10
      type = "A"
    }
  }

  health_check_custom_config {
    failure_threshold = 1
  }

  tags = { Name = "${var.project_name}-${each.key}" }
}
