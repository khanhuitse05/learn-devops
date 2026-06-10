# AWS Demo Roadmap

Quick review for the trainer before starting the training session. This repo goes from a
local Node.js app in `server/` to a backend running on AWS ECS/Fargate, publicly exposed via
ALB, connected to RDS/PostgreSQL, with secrets, observability, Redis, Grafana,
Infrastructure as Code, and cleanup.

## Demo Rules

- Default region: `ap-southeast-1`.
- Resource prefix: `learn-devops-demo-*`.
- Do not expose RDS/Redis to the internet.
- Do not modify the server source code in AWS labs; only change infrastructure, env vars, and secrets.
- Every service that can incur costs must have cleanup.

## Quick Setup

```bash
export AWS_REGION=ap-southeast-1
export AWS_DEFAULT_REGION="$AWS_REGION"
export DEMO_PREFIX=learn-devops-demo
aws sts get-caller-identity
```

## Roadmap Modules

| Step | Lab | Focus |
| --- | --- | --- |
| 00 | [Prerequisites](00-prerequisites.md) | Account safety, budget, CLI, region |
| 01 | [Complete Local Server Baseline](01-local-server-baseline.md) | Local app, health checks, request flow |
| 02 | [PostgreSQL Local](02-postgresql-local.md) | Local DB and real DB endpoints |
| 03 | [Docker Compose App + PostgreSQL](03-docker-compose-app-postgres.md) | Containerized local stack |
| 04 | [VPC Network](04-vpc-network.md) | VPC, subnets, route tables, security groups |
| 05 | [RDS PostgreSQL](05-rds-postgresql.md) | Private managed PostgreSQL |
| 06 | [ECR Image Registry](06-ecr-image-registry.md) | Build, tag, and push image |
| 07 | [ECS Fargate Service](07-ecs-fargate-service.md) | Run app container on ECS/Fargate |
| 08 | [ALB Public Entry](08-alb-public-entry.md) | Public HTTP entry point |
| 09 | [Secrets And Environment Variables](09-secrets-and-env.md) | Secrets Manager, SSM, runtime config |
| 10 | [Observability](10-observability.md) | CloudWatch logs, metrics, alarms, dashboard |
| 11 | [ElastiCache Redis](11-elasticache-redis.md) | Private Redis cache |
| 12 | [Amazon Managed Grafana](12-amazon-managed-grafana.md) | Grafana dashboards from CloudWatch |
| 13 | [CloudFormation](13-cloudformation.md) | AWS-native Infrastructure as Code |
| 14 | [Terraform](14-terraform.md) | Provider-based Infrastructure as Code |
| 15 | [Cleanup And Cost Control](15-cleanup-cost-control.md) | Delete resources and stop ongoing costs |

## Recommended Flow

1. Run steps 00-03 locally to understand the app and database behavior.
2. Build AWS network and data layer with steps 04-05.
3. Deploy the container through ECR, ECS, and ALB with steps 06-08.
4. Add production-style operations with steps 09-12.
5. Practice IaC with steps 13-14.
6. Run step 15 when the practice session ends.

## Resume And Cleanup

- Each numbered lab has its own `Prerequisites`, `Expected result`, `Cleanup`, and `Troubleshooting`.
- If a dependency was cleaned up, rerun the prerequisite step before continuing.
- If pausing mid-demo, scale down or delete hourly paid resources first: RDS, Fargate tasks, ALB, ElastiCache, Grafana.
- When in doubt, finish with [15 - Cleanup And Cost Control](15-cleanup-cost-control.md).