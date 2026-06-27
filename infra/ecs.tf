locals {
  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.region  # .name is deprecated in provider v6
  ecr_base   = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${data.aws_region.current.region}.amazonaws.com/${local.name_prefix}"

  smtp_secrets = [
    { name = "SMTP_HOST", valueFrom = aws_ssm_parameter.smtp_host.arn },
    { name = "SMTP_PORT", valueFrom = aws_ssm_parameter.smtp_port.arn },
    { name = "SMTP_USER", valueFrom = aws_ssm_parameter.smtp_user.arn },
    { name = "SMTP_PASS", valueFrom = aws_ssm_parameter.smtp_pass.arn },
    { name = "SMTP_FROM", valueFrom = aws_ssm_parameter.smtp_from.arn },
    { name = "APP_URL",   valueFrom = aws_ssm_parameter.app_url.arn },
  ]

  jwt_secrets = [
    { name = "JWT_SECRET",    valueFrom = aws_ssm_parameter.jwt_secret.arn },
    { name = "JWT_EXPIRES_IN",valueFrom = aws_ssm_parameter.jwt_expires_in.arn },
  ]
}

# ─── Cluster ────────────────────────────────────────────────────────────────

resource "aws_ecs_cluster" "main" {
  name = local.name_prefix

  setting {
    name  = "containerInsights"
    value = "disabled"
  }

  tags = { Name = "${local.name_prefix}-cluster" }
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

# ─── Combined Task Definition ─────────────────────────────────────────────
# All containers share the same awsvpc network namespace in Fargate,
# so they communicate via 127.0.0.1. No service discovery needed.

resource "aws_ecs_task_definition" "smartlogix" {
  family                   = local.name_prefix
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 2048  # 2 vCPU
  memory                   = 4096  # 4 GB
  execution_role_arn       = data.aws_iam_role.lab_role.arn
  task_role_arn            = data.aws_iam_role.lab_role.arn

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

  container_definitions = jsonencode([
    # ── PostgreSQL ──────────────────────────────────────────────────────────
    {
      name  = "postgres"
      image = "${local.ecr_base}-postgres-repo:latest"
      cpu   = 512
      memory = 1024
      essential = true

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
    },

    # ── Orders Service ──────────────────────────────────────────────────────
    {
      name  = "orders-service"
      image = "${local.ecr_base}-orders-service-repo:latest"
      cpu   = 256
      memory = 512
      essential = true

      environment = [
        { name = "PORT",                  value = "8081" },
        { name = "DB_URL",                value = "postgresql://postgres:${var.db_password}@127.0.0.1:5432/orders_db" },
        { name = "INVENTORY_SERVICE_URL", value = "http://127.0.0.1:8082" },
        { name = "SHIPPING_SERVICE_URL",  value = "http://127.0.0.1:8084" },
        { name = "ALLOWED_ORIGINS",       value = "*" },
      ]

      secrets = concat(local.smtp_secrets, local.jwt_secrets)

      portMappings = [{ containerPort = 8081, protocol = "tcp" }]

      dependsOn = [{ containerName = "postgres", condition = "HEALTHY" }]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/${var.project_name}/orders-service"
          "awslogs-region"        = local.region
          "awslogs-stream-prefix" = "orders"
        }
      }
    },

    # ── Inventory Service ───────────────────────────────────────────────────
    {
      name  = "inventory-service"
      image = "${local.ecr_base}-inventory-service-repo:latest"
      cpu   = 256
      memory = 512
      essential = true

      environment = [
        { name = "PORT",            value = "8082" },
        { name = "DB_URL",          value = "postgresql://postgres:${var.db_password}@127.0.0.1:5432/inventory_db" },
        { name = "ALLOWED_ORIGINS", value = "*" },
      ]

      secrets = local.jwt_secrets

      portMappings = [{ containerPort = 8082, protocol = "tcp" }]

      dependsOn = [{ containerName = "postgres", condition = "HEALTHY" }]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/${var.project_name}/inventory-service"
          "awslogs-region"        = local.region
          "awslogs-stream-prefix" = "inventory"
        }
      }
    },

    # ── Shipping Service ────────────────────────────────────────────────────
    {
      name  = "shipping-service"
      image = "${local.ecr_base}-shipping-service-repo:latest"
      cpu   = 256
      memory = 512
      essential = true

      environment = [
        { name = "PORT",                     value = "8084" },
        { name = "DB_URL",                   value = "postgresql://postgres:${var.db_password}@127.0.0.1:5432/shipping_db" },
        { name = "NOTIFICATION_SERVICE_URL", value = "http://127.0.0.1:8085" },
        { name = "ORDERS_SERVICE_URL",       value = "http://127.0.0.1:8081" },
        { name = "ALLOWED_ORIGINS",          value = "*" },
      ]

      secrets = concat(local.smtp_secrets, local.jwt_secrets)

      portMappings = [{ containerPort = 8084, protocol = "tcp" }]

      dependsOn = [{ containerName = "postgres", condition = "HEALTHY" }]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/${var.project_name}/shipping-service"
          "awslogs-region"        = local.region
          "awslogs-stream-prefix" = "shipping"
        }
      }
    },

    # ── Notification Service ────────────────────────────────────────────────
    {
      name  = "notification-service"
      image = "${local.ecr_base}-notification-service-repo:latest"
      cpu   = 128
      memory = 256
      essential = true

      environment = [
        { name = "PORT",            value = "8085" },
        { name = "DB_URL",          value = "postgresql://postgres:${var.db_password}@127.0.0.1:5432/notification_db" },
        { name = "ALLOWED_ORIGINS", value = "*" },
      ]

      secrets = local.jwt_secrets

      portMappings = [{ containerPort = 8085, protocol = "tcp" }]

      dependsOn = [{ containerName = "postgres", condition = "HEALTHY" }]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/${var.project_name}/notification-service"
          "awslogs-region"        = local.region
          "awslogs-stream-prefix" = "notification"
        }
      }
    },

    # ── Nginx API Gateway ───────────────────────────────────────────────────
    {
      name  = "nginx"
      image = "${local.ecr_base}-nginx-repo:latest"
      cpu   = 128
      memory = 128
      essential = true

      portMappings = [{ containerPort = 80, hostPort = 80, protocol = "tcp" }]

      dependsOn = [
        { containerName = "orders-service",       condition = "START" },
        { containerName = "inventory-service",    condition = "START" },
        { containerName = "shipping-service",     condition = "START" },
        { containerName = "notification-service", condition = "START" },
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/${var.project_name}/nginx"
          "awslogs-region"        = local.region
          "awslogs-stream-prefix" = "nginx"
        }
      }
    }
  ])
}

# ─── ECS Service ─────────────────────────────────────────────────────────────

resource "aws_ecs_service" "smartlogix" {
  name            = local.name_prefix
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.smartlogix.arn
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
    security_groups  = [aws_security_group.smartlogix.id]
    assign_public_ip = true
  }

  lifecycle {
    ignore_changes = [desired_count, task_definition]
  }
}
