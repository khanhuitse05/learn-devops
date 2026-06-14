resource "aws_ecs_cluster" "app" {
  name = "${var.demo_prefix}-cluster"

  tags = {
    Name = "${var.demo_prefix}-cluster"
  }
}

resource "aws_ecs_task_definition" "app" {
  family                   = "${var.demo_prefix}-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.container_cpu
  memory                   = var.container_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "app"
      image     = "${data.aws_ecr_repository.app.repository_url}:${var.image_tag}"
      essential = true
      portMappings = [
        {
          containerPort = var.app_port
          hostPort      = var.app_port
          protocol      = "tcp"
        }
      ]
      environment = [
        {
          name  = "PORT"
          value = tostring(var.app_port)
        },
        {
          name  = "HOST"
          value = "0.0.0.0"
        },
        {
          name  = "ECS_SERVICE_NAME"
          value = "${var.demo_prefix}-service"
        },
        {
          name  = "REDIS_HOST"
          value = aws_elasticache_serverless_cache.app.endpoint[0].address
        },
        {
          name  = "DEMO_REDIS_STATUS"
          value = "ok"
        }
      ]
      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = aws_ssm_parameter.database_url.arn
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.app.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "app"
        }
      }
    }
  ])

  tags = {
    Name = "${var.demo_prefix}-task"
  }

  depends_on = [
    aws_iam_role_policy_attachment.ecs_execution_managed,
    aws_iam_role_policy.ecs_execution_ssm
  ]
}

resource "aws_ecs_service" "app" {
  name            = "${var.demo_prefix}-service"
  cluster         = aws_ecs_cluster.app.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "app"
    container_port   = var.app_port
  }

  depends_on = [aws_lb_listener.http]

  tags = {
    Name = "${var.demo_prefix}-service"
  }
}