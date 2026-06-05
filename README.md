# learn-devops

Hands-on DevOps learning workspace that starts with a local Node.js service and
gradually deploys it to AWS ECS/Fargate with PostgreSQL/RDS, ECR, ALB, secrets,
logs, alarms, and cleanup.

The practical labs are designed around one complete demo app in `server/`.
During the AWS steps, you should mainly change infrastructure and environment
configuration, not the application source code.

## What Is Included

- `server/`: Node.js demo API, PostgreSQL schema, Dockerfile, Docker Compose
  stack, and sample `systemd` service files.
- `demo/`: step-by-step learning path from local development to ECS/Fargate.
- `demo/more/`: extra console-oriented notes for VPC and database setup.
- `devops_aws_ecs_learning_roadmap.docx.md`: longer roadmap notes.

## Prerequisites

- Node.js 18+ and npm.
- Docker and Docker Compose for container labs.
- AWS CLI for AWS labs.
- An AWS sandbox account with MFA and a small budget alarm before creating paid
  resources.

The AWS examples use `ap-southeast-1` by default:

```bash
export AWS_REGION=ap-southeast-1
export AWS_DEFAULT_REGION="$AWS_REGION"
export DEMO_PREFIX=learn-devops-demo
aws sts get-caller-identity
```

## Quick Start

Run the app locally:

```bash
cd server
npm ci
npm run check
npm start
```

In another terminal:

```bash
curl -i http://localhost:3000/health
curl -i http://localhost:3000/flow
curl -i http://localhost:3000/api/demo-order
curl -i http://localhost:3000/api/db/health
```

Run the app with local PostgreSQL through Docker Compose:

```bash
cd server
docker compose up --build -d
docker compose ps
curl -i http://localhost:3000/api/db/health
curl -i http://localhost:3000/api/orders
```

Reset the local database when needed:

```bash
docker compose down -v
```

## Demo Roadmap

Start with the roadmap overview:

- [AWS Demo Roadmap](demo/demo_roadmap.md)

Then follow the numbered labs:

| Step | Lab | Focus |
| --- | --- | --- |
| 00 | [Prerequisites](demo/00-prerequisites.md) | AWS account safety, budget, CLI, region |
| 01 | [Complete Local Server Baseline](demo/01-local-server-baseline.md) | Local app, health checks, request flow |
| 02 | [PostgreSQL Local](demo/02-postgresql-local.md) | Local database and real DB endpoints |
| 03 | [Docker Compose App + PostgreSQL](demo/03-docker-compose-app-postgres.md) | Containerized local stack |
| 04 | [VPC Network](demo/04-vpc-network.md) | VPC, subnets, route tables, security groups |
| 05 | [RDS PostgreSQL](demo/05-rds-postgresql.md) | Private managed PostgreSQL |
| 06 | [ECR Image Registry](demo/06-ecr-image-registry.md) | Build, tag, and push Docker image |
| 07 | [ECS Fargate Service](demo/07-ecs-fargate-service.md) | Run the app container on ECS/Fargate |
| 08 | [ALB Public Entry](demo/08-alb-public-entry.md) | Public HTTP entry point to ECS |
| 09 | [Secrets And Environment Variables](demo/09-secrets-and-env.md) | Secrets Manager, SSM, runtime config |
| 10 | [Observability](demo/10-observability.md) | CloudWatch logs, metrics, and alarms |
| 11 | [Cleanup And Cost Control](demo/11-cleanup-cost-control.md) | Delete resources and stop ongoing costs |

Recommended order:

1. Complete steps 00-03 locally and understand the app behavior.
2. Build the network and database layer with steps 04-05.
3. Deploy the container through ECR, ECS, and ALB with steps 06-08.
4. Add production-style configuration and operations with steps 09-10.
5. Run step 11 as soon as you finish practicing.

## Demo App Endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | App process health check for ALB/ECS |
| `GET /flow` | Request path learning demo |
| `GET /api/demo-order` | Simulated RDS, Redis, and EFS dependency demo |
| `GET /api/db/health` | Real PostgreSQL `select 1` check |
| `GET /api/orders` | Read PostgreSQL orders |
| `GET /api/orders/:id` | Read one PostgreSQL order |
| `POST /api/orders` | Create one PostgreSQL order |
| `GET /crash` | Intentional process failure for restart practice |

See [server/README.md](server/README.md) for full local, Docker, PostgreSQL, and
`systemd` usage.

## Cost Reminder

Some AWS labs can create paid resources such as RDS, Fargate, ALB, NAT Gateway,
CloudWatch logs, and Secrets Manager. Use a sandbox account, keep a small budget
alarm enabled, and clean up resources after each practice session.

When in doubt, finish with:

- [Cleanup And Cost Control](demo/11-cleanup-cost-control.md)
