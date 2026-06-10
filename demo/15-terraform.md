# 15 - Terraform (Full Stack IaC)

## Objective

Deploy the **entire demo stack** from steps 04-12 using Terraform — the same resources as CloudFormation but with a different IaC tool, state management, and multi-cloud portability.

## Prerequisites

- Completed [step 00](00-prerequisites.md): AWS CLI configured, correct account/region.
- Completed [step 14](14-cloudformation.md) to compare CloudFormation vs Terraform.
- Completed the manual steps 04-12 at least once to understand each resource.
- Cleaned up any existing `learn-devops-demo-*` resources (use [step 13](13-cleanup-cost-control.md)).
- Terraform CLI installed (`terraform --version` → 1.5+).
- ECR image `learn-devops-demo-node:demo-001` already pushed (from step 06).

## What This Config Creates

```
VPC (10.0.0.0/16)
├── 2 Public Subnets  (10.0.1.0/24, 10.0.2.0/24)
├── 2 Private Subnets (10.0.11.0/24, 10.0.12.0/24)
├── Internet Gateway
├── Public Route Table (0.0.0.0/0 → IGW)
│
├── Security Groups (ALB, ECS, RDS, Redis)
├── RDS PostgreSQL (db.t4g.micro)
├── ElastiCache Redis Serverless
├── ECR Repository
├── ECS Fargate Cluster + Task Definition + Service
├── ALB + Target Group + Listener
├── SSM Parameter (DB URL)
├── CloudWatch Log Group + Alarm + Dashboard
└── Amazon Managed Grafana Workspace
```

## Estimated cost

| Resource | Approx. Rate |
|----------|-------------|
| RDS db.t4g.micro | ~$0.016/hr |
| ElastiCache Serverless | ~$0.025/hr |
| ECS Fargate 0.25 vCPU | ~$0.012/hr |
| ALB | ~$0.0225/hr |
| Grafana | ~$9/month |
| **Total** | **~$2.50/day** |

> ⚠️ **Always run `terraform destroy` when done!**

---

## Part 1: Terraform Project Structure

```
learn-devops-demo-tf/
├── main.tf              # Provider + main resources
├── variables.tf          # Input variables
├── outputs.tf            # Output values
├── terraform.tfvars      # Your variable values (DO NOT COMMIT)
├── vpc.tf                # VPC + subnets + IGW + route tables
├── security-groups.tf     # All 4 security groups
├── rds.tf                # RDS PostgreSQL
├── elasticache.tf        # ElastiCache Redis Serverless
├── ecr.tf                # ECR repository
├── iam.tf                # IAM roles for ECS
├── ecs.tf                # ECS cluster + task def + service
├── alb.tf                # ALB + target group + listener
├── ssm.tf                # SSM Parameter for DB URL
├── cloudwatch.tf          # Log group + alarm + dashboard
├── grafana.tf             # Amazon Managed Grafana
└── .gitignore
```

---

## Part 2: The Terraform Configuration Files

### Step 1: Create project directory

```bash
mkdir -p ~/learn-devops-demo-tf
cd ~/learn-devops-demo-tf
```

### Step 2: `.gitignore`

```hcl
# .gitignore
*.tfstate
*.tfstate.*
.terraform/
*.tfvars
.terraform.lock.hcl
```

### Step 3: `main.tf`

```hcl
# main.tf
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.demo_prefix
      ManagedBy   = "Terraform"
      Environment = "learning"
    }
  }
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
```

### Step 4: `variables.tf`

```hcl
# variables.tf
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-southeast-1"
}

variable "demo_prefix" {
  description = "Prefix for all resource names"
  type        = string
  default     = "learn-devops-demo"
}

variable "db_username" {
  description = "RDS master username"
  type        = string
  default     = "devops_demo"
}

variable "db_password" {
  description = "RDS master password (min 8 chars)"
  type        = string
  sensitive   = true
}

variable "db_name" {
  description = "Initial database name"
  type        = string
  default     = "devops_demo"
}

variable "app_port" {
  description = "Container application port"
  type        = number
  default     = 3000
}

variable "image_tag" {
  description = "ECR image tag to deploy"
  type        = string
  default     = "demo-001"
}

variable "container_cpu" {
  description = "Fargate CPU units (256 = 0.25 vCPU)"
  type        = number
  default     = 256
}

variable "container_memory" {
  description = "Fargate memory (MiB)"
  type        = number
  default     = 512
}

variable "desired_count" {
  description = "Number of ECS tasks"
  type        = number
  default     = 1
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 3
}

variable "azs" {
  description = "Availability Zones to use"
  type        = list(string)
  default     = ["ap-southeast-1a", "ap-southeast-1b"]
}
```

### Step 5: `terraform.tfvars`

```hcl
# terraform.tfvars - DO NOT COMMIT this file!
db_password = "YourSecurePassword123"
```

### Step 6: `vpc.tf`

```hcl
# vpc.tf - VPC + Subnets + Internet Gateway + Route Tables

resource "aws_vpc" "demo" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "${var.demo_prefix}-vpc"
  }
}

resource "aws_internet_gateway" "demo" {
  vpc_id = aws_vpc.demo.id

  tags = {
    Name = "${var.demo_prefix}-igw"
  }
}

# Public Subnets
resource "aws_subnet" "public_a" {
  vpc_id                  = aws_vpc.demo.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = var.azs[0]
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.demo_prefix}-public-a"
  }
}

resource "aws_subnet" "public_b" {
  vpc_id                  = aws_vpc.demo.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = var.azs[1]
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.demo_prefix}-public-b"
  }
}

# Private Subnets
resource "aws_subnet" "private_a" {
  vpc_id            = aws_vpc.demo.id
  cidr_block        = "10.0.11.0/24"
  availability_zone = var.azs[0]

  tags = {
    Name = "${var.demo_prefix}-private-a"
  }
}

resource "aws_subnet" "private_b" {
  vpc_id            = aws_vpc.demo.id
  cidr_block        = "10.0.12.0/24"
  availability_zone = var.azs[1]

  tags = {
    Name = "${var.demo_prefix}-private-b"
  }
}

# Public Route Table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.demo.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.demo.id
  }

  tags = {
    Name = "${var.demo_prefix}-public-rt"
  }
}

resource "aws_route_table_association" "public_a" {
  subnet_id      = aws_subnet.public_a.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "public_b" {
  subnet_id      = aws_subnet.public_b.id
  route_table_id = aws_route_table.public.id
}
```

### Step 7: `security-groups.tf`

```hcl
# security-groups.tf

resource "aws_security_group" "alb" {
  name        = "${var.demo_prefix}-alb-sg"
  description = "Allow HTTP from internet to ALB"
  vpc_id      = aws_vpc.demo.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.demo_prefix}-alb-sg"
  }
}

resource "aws_security_group" "ecs" {
  name        = "${var.demo_prefix}-ecs-sg"
  description = "Allow app traffic from ALB to ECS"
  vpc_id      = aws_vpc.demo.id

  ingress {
    from_port       = var.app_port
    to_port         = var.app_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.demo_prefix}-ecs-sg"
  }
}

resource "aws_security_group" "rds" {
  name        = "${var.demo_prefix}-rds-sg"
  description = "Allow PostgreSQL from ECS to RDS"
  vpc_id      = aws_vpc.demo.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.demo_prefix}-rds-sg"
  }
}

resource "aws_security_group" "redis" {
  name        = "${var.demo_prefix}-redis-sg"
  description = "Allow Redis from ECS"
  vpc_id      = aws_vpc.demo.id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.demo_prefix}-redis-sg"
  }
}
```

### Step 8: `rds.tf`

```hcl
# rds.tf - RDS PostgreSQL

resource "aws_db_subnet_group" "demo" {
  name        = "${var.demo_prefix}-db-subnet"
  description = "RDS subnet group for private subnets"
  subnet_ids  = [aws_subnet.private_a.id, aws_subnet.private_b.id]

  tags = {
    Name = "${var.demo_prefix}-db-subnet"
  }
}

resource "aws_db_instance" "demo" {
  identifier     = "${var.demo_prefix}-postgres"
  engine         = "postgres"
  engine_version = "16.3"
  instance_class = "db.t4g.micro"

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  allocated_storage     = 20
  storage_type          = "gp3"
  db_subnet_group_name  = aws_db_subnet_group.demo.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  publicly_accessible    = false
  backup_retention_period = 0
  deletion_protection    = false
  skip_final_snapshot    = true

  tags = {
    Name = "${var.demo_prefix}-postgres"
  }
}
```

### Step 9: `elasticache.tf`

```hcl
# elasticache.tf - ElastiCache Redis Serverless

resource "aws_elasticache_subnet_group" "demo" {
  name        = "${var.demo_prefix}-redis-subnet"
  description = "Redis subnet group for private subnets"
  subnet_ids  = [aws_subnet.private_a.id, aws_subnet.private_b.id]

  tags = {
    Name = "${var.demo_prefix}-redis-subnet"
  }
}

resource "aws_elasticache_serverless_cache" "demo" {
  engine = "redis"
  name   = "${var.demo_prefix}-redis"

  cache_usage_limits {
    data_storage {
      maximum = 10
      unit    = "GB"
    }
    ecpu_per_second {
      maximum = 1000
    }
  }

  security_group_ids = [aws_security_group.redis.id]
  subnet_ids         = [aws_subnet.private_a.id, aws_subnet.private_b.id]

  tags = {
    Name = "${var.demo_prefix}-redis"
  }
}
```

### Step 10: `ecr.tf`

```hcl
# ecr.tf - ECR private repository

resource "aws_ecr_repository" "demo" {
  name                 = "${var.demo_prefix}-node"
  image_tag_mutability = "MUTABLE"

  tags = {
    Name = "${var.demo_prefix}-node"
  }
}
```

### Step 11: `iam.tf`

```hcl
# iam.tf - IAM roles for ECS

resource "aws_iam_role" "ecs_execution" {
  name = "${var.demo_prefix}-ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Name = "${var.demo_prefix}-ecs-execution-role"
  }
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "ecs_execution_ssm" {
  name = "ReadDbUrlParameter"
  role = aws_iam_role.ecs_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters"
        ]
        Resource = "arn:aws:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter/${var.demo_prefix}/db-url"
      }
    ]
  })
}

resource "aws_iam_role" "ecs_task" {
  name = "${var.demo_prefix}-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Name = "${var.demo_prefix}-ecs-task-role"
  }
}
```

### Step 12: `ssm.tf`

```hcl
# ssm.tf - SSM Parameter for database URL

resource "aws_ssm_parameter" "db_url" {
  name  = "/${var.demo_prefix}/db-url"
  type  = "String"
  value = "postgres://${var.db_username}:${var.db_password}@${aws_db_instance.demo.endpoint}/${var.db_name}?sslmode=require"

  tags = {
    Name = "${var.demo_prefix}-db-url"
  }
}

# CloudWatch Log Group for ECS
resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/${var.demo_prefix}-node"
  retention_in_days = var.log_retention_days

  tags = {
    Name = "${var.demo_prefix}-ecs-logs"
  }
}
```

### Step 13: `ecs.tf`

```hcl
# ecs.tf - ECS Fargate Cluster + Task Definition + Service

resource "aws_ecs_cluster" "demo" {
  name = "${var.demo_prefix}-cluster"

  tags = {
    Name = "${var.demo_prefix}-cluster"
  }
}

resource "aws_ecs_task_definition" "demo" {
  family                   = "${var.demo_prefix}-node"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.container_cpu
  memory                   = var.container_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "app"
      image     = "${aws_ecr_repository.demo.repository_url}:${var.image_tag}"
      essential = true
      portMappings = [
        {
          containerPort = var.app_port
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
        }
      ]
      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = aws_ssm_parameter.db_url.arn
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.ecs.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  ])

  tags = {
    Name = "${var.demo_prefix}-node"
  }
}

resource "aws_ecs_service" "demo" {
  name            = "${var.demo_prefix}-node-service"
  cluster         = aws_ecs_cluster.demo.id
  task_definition = aws_ecs_task_definition.demo.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [aws_subnet.private_a.id, aws_subnet.private_b.id]
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.demo.arn
    container_name   = "app"
    container_port   = var.app_port
  }

  depends_on = [aws_lb_listener.demo]

  tags = {
    Name = "${var.demo_prefix}-node-service"
  }
}
```

### Step 14: `alb.tf`

```hcl
# alb.tf - Application Load Balancer

resource "aws_lb" "demo" {
  name               = "${var.demo_prefix}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = [aws_subnet.public_a.id, aws_subnet.public_b.id]
  ip_address_type    = "ipv4"

  tags = {
    Name = "${var.demo_prefix}-alb"
  }
}

resource "aws_lb_target_group" "demo" {
  name        = "${var.demo_prefix}-node-tg"
  port        = var.app_port
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = aws_vpc.demo.id

  health_check {
    path                = "/health"
    protocol            = "HTTP"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  tags = {
    Name = "${var.demo_prefix}-node-tg"
  }
}

resource "aws_lb_listener" "demo" {
  load_balancer_arn = aws_lb.demo.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.demo.arn
  }
}
```

### Step 15: `cloudwatch.tf`

```hcl
# cloudwatch.tf - CloudWatch Alarm + Dashboard

resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name          = "${var.demo_prefix}-ecs-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "ECS CPU utilization exceeds 80%"

  dimensions = {
    ClusterName = aws_ecs_cluster.demo.name
    ServiceName = aws_ecs_service.demo.name
  }

  tags = {
    Name = "${var.demo_prefix}-ecs-cpu-alarm"
  }
}

resource "aws_cloudwatch_dashboard" "demo" {
  dashboard_name = "${var.demo_prefix}-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/ECS", "CPUUtilization", "ClusterName", aws_ecs_cluster.demo.name, "ServiceName", aws_ecs_service.demo.name]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "ECS CPU Utilization"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/ECS", "MemoryUtilization", "ClusterName", aws_ecs_cluster.demo.name, "ServiceName", aws_ecs_service.demo.name]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "ECS Memory Utilization"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", aws_lb.demo.arn_suffix]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "ALB Target Response Time"
          period  = 300
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "HTTPCode_Target_5XX_Count", "LoadBalancer", aws_lb.demo.arn_suffix]
          ]
          view    = "timeSeries"
          stacked = false
          region  = var.aws_region
          title   = "ALB 5XX Errors"
          period  = 300
        }
      }
    ]
  })
}
```

### Step 16: `grafana.tf`

```hcl
# grafana.tf - Amazon Managed Grafana
# ⚠️ Requires IAM Identity Center configured in your account

resource "grafana_workspace" "demo" {
  name                     = "${var.demo_prefix}-grafana"
  account_access_type      = "CURRENT_ACCOUNT"
  authentication_providers = ["AWS_SSO"]
  permission_type          = "SERVICE_MANAGED"
  data_sources             = ["CLOUDWATCH"]
  description              = "Demo Grafana workspace for learn-devops"
}
```

### Step 17: `outputs.tf`

```hcl
# outputs.tf

output "alb_dns_name" {
  description = "ALB public DNS name"
  value       = "http://${aws_lb.demo.dns_name}"
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = aws_db_instance.demo.endpoint
}

output "rds_port" {
  description = "RDS PostgreSQL port"
  value       = aws_db_instance.demo.port
}

output "ecr_repository_url" {
  description = "ECR repository URL"
  value       = aws_ecr_repository.demo.repository_url
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = aws_elasticache_serverless_cache.demo.endpoint[0].address
}

output "redis_port" {
  description = "ElastiCache Redis port"
  value       = aws_elasticache_serverless_cache.demo.endpoint[0].port
}

output "grafana_endpoint" {
  description = "Grafana workspace URL"
  value       = grafana_workspace.demo.endpoint
}

output "ssm_db_url_param" {
  description = "SSM Parameter name for DB URL"
  value       = aws_ssm_parameter.db_url.name
}
```

---

## Part 3: Deploy with Terraform

### Step 1: Initialize

```bash
cd ~/learn-devops-demo-tf
terraform init
```

This downloads the AWS provider and initializes the backend (local state file by default).

### Step 2: Format and validate

```bash
terraform fmt
terraform validate
```

### Step 3: Preview changes (plan)

```bash
terraform plan
```

Review the output carefully:
- `+` means Terraform will create the resource
- `~` means update in-place
- `-` means destroy

### Step 4: Apply

```bash
terraform apply
```

Type `yes` when prompted. This takes **10-20 minutes** (RDS + Redis + Grafana).

> 💡 **Tip**: Use `terraform apply -auto-approve` to skip the `yes` prompt (useful in CI/CD, but be careful!).

### Step 5: Check state

```bash
# List all resources managed by Terraform
terraform state list

# Show details of a specific resource
terraform state show aws_db_instance.demo
```

### Step 6: View outputs

```bash
terraform output
```

---

## Part 4: Verify the Deployment

```bash
# Get ALB DNS and test
ALB_DNS=$(terraform output -raw alb_dns_name)
echo "$ALB_DNS"

# Wait 1-2 min for ECS tasks to be healthy, then test
curl -i "$ALB_DNS/health"
curl -i "$ALB_DNS/api/db/health"
curl -i "$ALB_DNS/flow"
curl -i "$ALB_DNS/api/demo-order"
curl -i "$ALB_DNS/test-error"
```

Expected:
- `/health` → HTTP 200
- `/api/db/health` → HTTP 200 (connected to RDS)
- `/test-error` → HTTP 500 (intentional, for metrics)

### Check CloudWatch logs

```bash
aws logs tail /ecs/learn-devops-demo-node --since 10m
```

### Check dashboard

```bash
aws cloudwatch list-dashboards --dashboard-name-prefix learn-devops-demo
```

Open CloudWatch Console → Dashboards → `learn-devops-demo-dashboard`.

### Check Grafana

```bash
terraform output grafana_endpoint
```

> ⚠️ Grafana login requires IAM Identity Center user assignment. Verify the workspace exists in AWS Console → Amazon Managed Grafana.

---

## Part 5: Update Infrastructure

Change any variable or resource, then:

```bash
# Example: scale to 2 tasks
# Edit terraform.tfvars or run:
terraform apply -var="desired_count=2"

# Terraform shows exactly what will change before applying
```

---

## Part 6: Destroy Everything

```bash
terraform destroy
```

Type `yes` when prompted. This deletes **all** resources created by this config.

⏱ Takes **15-25 minutes** (RDS + Grafana take longest).

```bash
# Verify nothing left in state
terraform state list
```

> ⚠️ **Always run `terraform destroy` after the lab** to avoid ongoing charges!

---

## Troubleshooting

| Problem | Likely Cause | Fix |
|---------|-------------|-----|
| `terraform init` fails | Network/proxy issue | Check internet connection, verify `required_providers` source |
| `terraform validate` errors | Syntax error in HCL | Run `terraform fmt` first, check line numbers in error |
| `Error: creating RDS instance` | Password too simple | Use 8+ chars with mix of case, numbers, symbols |
| ECS tasks stuck PROVISIONING | Private subnet, no NAT/VPC endpoints | Either: (1) Add VPC endpoints for ECR+Logs+S3, or (2) Change `assign_public_ip` to `true` in ecs.tf and move to public subnets |
| Grafana workspace fails | Missing IAM Identity Center | Remove `grafana.tf` from the project, run `terraform apply` again |
| Target unhealthy | Task still starting | Wait 2-3 minutes, check CloudWatch Logs |
| `terraform destroy` stuck | Resource dependency | Wait longer; check AWS Console for resources in `deleting` state |
| State file lost | Local state deleted | Recreate resources manually or from backup. **Lesson**: Use remote state (S3 + DynamoDB) for anything beyond learning |

### Note: ECS in Private Subnets without NAT

The config above places ECS tasks in **private subnets** with `assign_public_ip = false`. To pull images from ECR, tasks need either:

1. **VPC Endpoints** (recommended for production):
```hcl
# Add these to vpc.tf (not included in base config for simplicity)
resource "aws_vpc_endpoint" "ecr_api" { ... }
resource "aws_vpc_endpoint" "ecr_dkr" { ... }
resource "aws_vpc_endpoint" "logs" { ... }
resource "aws_vpc_endpoint" "s3" { ... }
```

2. **Public IP** (simpler for learning): Change in `ecs.tf`:
```hcl
network_configuration {
    subnets          = [aws_subnet.public_a.id, aws_subnet.public_b.id]
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = true  # ← changed
}
```

---

## Terraform vs CloudFormation (Quick Comparison)

| Feature | CloudFormation (Step 14) | Terraform (Step 15) |
|---------|--------------------------|---------------------|
| **Language** | YAML / JSON | HCL (HashiCorp Config Language) |
| **State** | Managed by AWS automatically | Self-managed (local or remote) |
| **Plan before apply** | Change Sets (manual) | `terraform plan` (built-in) |
| **Provider ecosystem** | AWS only | AWS + GCP + Azure + 1000+ providers |
| **Module registry** | AWS CloudFormation Registry | Terraform Registry (public) |
| **Drift detection** | Built-in | `terraform plan` shows drift |
| **Deletion** | `aws cloudformation delete-stack` | `terraform destroy` |
| **Learning curve** | Easier for AWS-only teams | Steeper initial setup, more flexible |

---

## Expected Result

- All resources from steps 04-12 created with `terraform apply`.
- `terraform state list` shows all managed resources (~25 resources).
- ALB DNS returns `/health` → 200, `/api/db/health` → 200.
- CloudWatch Dashboard shows ECS + ALB metrics.
- `terraform destroy` cleanly removes everything.
- State file documents exactly what was deployed.

---

**Previous**: [Step 14 - CloudFormation](14-cloudformation.md) — Compare the two IaC approaches.

**Finish**: [Step 13 - Cleanup](13-cleanup-cost-control.md) — Manual cleanup if `terraform destroy` misses anything.