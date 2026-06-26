locals {
  account_id   = data.aws_caller_identity.current.account_id
  region       = data.aws_region.current.name
  ecr_registry = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${data.aws_region.current.name}.amazonaws.com"
  namespace    = "${var.project_name}.local"
  db_url       = "postgresql://postgres:${var.db_password}@postgres-db.${var.project_name}.local:5432"

  # ECR image URLs — match naming from ecr.tf
  ecr_base = "${local.ecr_registry}/${local.name_prefix}"

  smtp_secrets = [
    { name = "SMTP_HOST", valueFrom = aws_ssm_parameter.smtp_host.arn },
    { name = "SMTP_PORT", valueFrom = aws_ssm_parameter.smtp_port.arn },
    { name = "SMTP_USER", valueFrom = aws_ssm_parameter.smtp_user.arn },
    { name = "SMTP_PASS", valueFrom = aws_ssm_parameter.smtp_pass.arn },
    { name = "SMTP_FROM", valueFrom = aws_ssm_parameter.smtp_from.arn },
    { name = "APP_URL",   valueFrom = aws_ssm_parameter.app_url.arn },
  ]
}

# ─── Cluster ────────────────────────────────────────────────────────────────

resource "aws_ecs_cluster" "main" {
  name = var.project_name

  setting {
    name  = "containerInsights"
    value = "disabled"
  }

  tags = { Name = "${var.project_name}-cluster" }
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name       = aws_ecs_cluster.main.name
  capacity_providers = ["FARGATE_SPOT", "FARGATE"]

  default_capacity_provider_strategy {
    capacity_provider = "FARGATE_SPOT"
    weight            = 4
    base              = 0
  }
  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1
    base              = 0
  }
}

resource "aws_cloudwatch_log_group" "services" {
  for_each          = toset(["orders-service", "inventory-service", "shipping-service", "notification-service", "nginx", "postgres-db"])
  name              = "/ecs/${var.project_name}/${each.key}"
  retention_in_days = 7
}

# ─── PostgreSQL ─────────────────────────────────────────────────────────────

resource "aws_ecs_task_definition" "postgres" {
  family                   = "${var.project_name}-postgres"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.task_execution.arn
  task_role_arn            = aws_iam_role.task_role.arn

  volume {
    name = "pgdata"
    efs_volume_configuration {
      file_system_id     = aws_efs_file_system.postgres.id
      transit_encryption = "ENABLED"
      authorization_config {
        access_point_id = aws_efs_access_point.postgres.id
        iam             = "DISABLED"
      }
    }
  }

  container_definitions = jsonencode([{
    name  = "postgres"
    image = "${local.ecr_base}-postgres-repo:latest"

    environment = [
      { name = "POSTGRES_USER",     value = "postgres" },
      { name = "POSTGRES_PASSWORD", value = var.db_password },
      { name = "PGDATA",            value = "/var/lib/postgresql/data/pgdata" }
    ]

    mountPoints = [{
      sourceVolume  = "pgdata"
      containerPath = "/var/lib/postgresql/data"
      readOnly      = false
    }]

    portMappings = [{ containerPort = 5432, protocol = "tcp" }]

    healthCheck = {
      command     = ["CMD-SHELL", "pg_isready -U postgres"]
      interval    = 30
      timeout     = 5
      retries     = 5
      startPeriod = 60
    }

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/${var.project_name}/postgres-db"
        "awslogs-region"        = local.region
        "awslogs-stream-prefix" = "postgres"
      }
    }

    essential = true
  }])
}

resource "aws_ecs_service" "postgres" {
  name            = "postgres-db"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.postgres.arn
  desired_count   = 1

  # PostgreSQL uses FARGATE (not SPOT) to avoid data corruption on interruption
  capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1
    base              = 1
  }

  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.postgres.id]
    assign_public_ip = true
  }

  service_registries {
    registry_arn = aws_service_discovery_service.main["postgres-db"].arn
  }

  lifecycle {
    ignore_changes = [desired_count]
  }
}

# ─── Orders Service ──────────────────────────────────────────────────────────

resource "aws_ecs_task_definition" "orders" {
  family                   = "${var.project_name}-orders"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.task_execution.arn
  task_role_arn            = aws_iam_role.task_role.arn

  container_definitions = jsonencode([{
    name  = "orders-service"
    image = "${local.ecr_base}-orders-service-repo:latest"

    environment = [
      { name = "PORT",                  value = "8081" },
      { name = "DB_URL",                value = "${local.db_url}/orders_db" },
      { name = "INVENTORY_SERVICE_URL", value = "http://inventory-service.${local.namespace}:8082" },
      { name = "SHIPPING_SERVICE_URL",  value = "http://shipping-service.${local.namespace}:8084" },
      { name = "ALLOWED_ORIGINS",       value = "*" },
    ]

    secrets = local.smtp_secrets

    portMappings = [{ containerPort = 8081, protocol = "tcp" }]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/${var.project_name}/orders-service"
        "awslogs-region"        = local.region
        "awslogs-stream-prefix" = "orders"
      }
    }

    essential = true
  }])
}

resource "aws_ecs_service" "orders" {
  name            = "orders-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.orders.arn
  desired_count   = 1

  capacity_provider_strategy {
    capacity_provider = "FARGATE_SPOT"
    weight            = 4
    base              = 0
  }
  capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1
    base              = 0
  }

  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.services.id]
    assign_public_ip = true
  }

  service_registries {
    registry_arn = aws_service_discovery_service.main["orders-service"].arn
  }

  depends_on = [aws_ecs_service.postgres]

  lifecycle {
    ignore_changes = [desired_count, task_definition]
  }
}

# ─── Inventory Service ───────────────────────────────────────────────────────

resource "aws_ecs_task_definition" "inventory" {
  family                   = "${var.project_name}-inventory"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.task_execution.arn
  task_role_arn            = aws_iam_role.task_role.arn

  container_definitions = jsonencode([{
    name  = "inventory-service"
    image = "${local.ecr_base}-inventory-service-repo:latest"

    environment = [
      { name = "PORT",            value = "8082" },
      { name = "DB_URL",          value = "${local.db_url}/inventory_db" },
      { name = "ALLOWED_ORIGINS", value = "*" },
    ]

    portMappings = [{ containerPort = 8082, protocol = "tcp" }]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/${var.project_name}/inventory-service"
        "awslogs-region"        = local.region
        "awslogs-stream-prefix" = "inventory"
      }
    }

    essential = true
  }])
}

resource "aws_ecs_service" "inventory" {
  name            = "inventory-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.inventory.arn
  desired_count   = 1

  capacity_provider_strategy {
    capacity_provider = "FARGATE_SPOT"
    weight            = 4
    base              = 0
  }
  capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1
    base              = 0
  }

  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.services.id]
    assign_public_ip = true
  }

  service_registries {
    registry_arn = aws_service_discovery_service.main["inventory-service"].arn
  }

  depends_on = [aws_ecs_service.postgres]

  lifecycle {
    ignore_changes = [desired_count, task_definition]
  }
}

# ─── Shipping Service ────────────────────────────────────────────────────────

resource "aws_ecs_task_definition" "shipping" {
  family                   = "${var.project_name}-shipping"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.task_execution.arn
  task_role_arn            = aws_iam_role.task_role.arn

  container_definitions = jsonencode([{
    name  = "shipping-service"
    image = "${local.ecr_base}-shipping-service-repo:latest"

    environment = [
      { name = "PORT",                    value = "8084" },
      { name = "DB_URL",                  value = "${local.db_url}/shipping_db" },
      { name = "NOTIFICATION_SERVICE_URL", value = "http://notification-service.${local.namespace}:8085" },
      { name = "ORDERS_SERVICE_URL",      value = "http://orders-service.${local.namespace}:8081" },
      { name = "ALLOWED_ORIGINS",         value = "*" },
    ]

    secrets = local.smtp_secrets

    portMappings = [{ containerPort = 8084, protocol = "tcp" }]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/${var.project_name}/shipping-service"
        "awslogs-region"        = local.region
        "awslogs-stream-prefix" = "shipping"
      }
    }

    essential = true
  }])
}

resource "aws_ecs_service" "shipping" {
  name            = "shipping-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.shipping.arn
  desired_count   = 1

  capacity_provider_strategy {
    capacity_provider = "FARGATE_SPOT"
    weight            = 4
    base              = 0
  }
  capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1
    base              = 0
  }

  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.services.id]
    assign_public_ip = true
  }

  service_registries {
    registry_arn = aws_service_discovery_service.main["shipping-service"].arn
  }

  depends_on = [aws_ecs_service.postgres]

  lifecycle {
    ignore_changes = [desired_count, task_definition]
  }
}

# ─── Notification Service ────────────────────────────────────────────────────

resource "aws_ecs_task_definition" "notification" {
  family                   = "${var.project_name}-notification"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.task_execution.arn
  task_role_arn            = aws_iam_role.task_role.arn

  container_definitions = jsonencode([{
    name  = "notification-service"
    image = "${local.ecr_base}-notification-service-repo:latest"

    environment = [
      { name = "PORT",            value = "8085" },
      { name = "DB_URL",          value = "${local.db_url}/notification_db" },
      { name = "ALLOWED_ORIGINS", value = "*" },
    ]

    portMappings = [{ containerPort = 8085, protocol = "tcp" }]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/${var.project_name}/notification-service"
        "awslogs-region"        = local.region
        "awslogs-stream-prefix" = "notification"
      }
    }

    essential = true
  }])
}

resource "aws_ecs_service" "notification" {
  name            = "notification-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.notification.arn
  desired_count   = 1

  capacity_provider_strategy {
    capacity_provider = "FARGATE_SPOT"
    weight            = 4
    base              = 0
  }
  capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1
    base              = 0
  }

  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.services.id]
    assign_public_ip = true
  }

  service_registries {
    registry_arn = aws_service_discovery_service.main["notification-service"].arn
  }

  depends_on = [aws_ecs_service.postgres]

  lifecycle {
    ignore_changes = [desired_count, task_definition]
  }
}

# ─── Nginx API Gateway ───────────────────────────────────────────────────────

resource "aws_ecs_task_definition" "nginx" {
  family                   = "${var.project_name}-nginx"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.task_execution.arn
  task_role_arn            = aws_iam_role.task_role.arn

  container_definitions = jsonencode([{
    name  = "nginx"
    image = "${local.ecr_base}-nginx-repo:latest"

    portMappings = [{ containerPort = 80, protocol = "tcp" }]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/${var.project_name}/nginx"
        "awslogs-region"        = local.region
        "awslogs-stream-prefix" = "nginx"
      }
    }

    essential = true
  }])
}

resource "aws_ecs_service" "nginx" {
  name            = "nginx"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.nginx.arn
  desired_count   = 1

  # Nginx uses FARGATE standard for stable public IP
  capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1
    base              = 1
  }

  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.nginx.id]
    assign_public_ip = true
  }

  depends_on = [
    aws_ecs_service.orders,
    aws_ecs_service.inventory,
    aws_ecs_service.shipping,
    aws_ecs_service.notification,
  ]

  lifecycle {
    ignore_changes = [desired_count, task_definition]
  }
}
