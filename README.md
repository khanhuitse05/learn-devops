# learn-devops

Hands-on DevOps training workspace for moving one local Node.js demo app to AWS
ECS/Fargate with ECR, ALB, RDS/PostgreSQL, secrets, observability, Redis,
Infrastructure as Code, and cleanup.

This root README is only a quick entry point for trainers. Detailed setup,
commands, checks, and troubleshooting live inside the numbered demo files.

## Start Here

1. Review [AWS Demo Roadmap](demo/demo_roadmap.md).
2. Prepare the account with [00 - Prerequisites](demo/00-prerequisites.md).
3. Start the hands-on flow at [01 - Complete Local Server Baseline](demo/01-local-server-baseline.md).
4. Use [server/README.md](server/README.md) only when you need direct server command details.

## What Is Included

- `server/`: complete Node.js demo API, PostgreSQL schema, Docker assets, and sample `systemd` services.
- `demo/`: numbered trainer-led labs from local baseline to AWS ECS/Fargate.
- `demo/more/`: extra Console notes for VPC, RDS, and CloudShell VPC environment.
- `devops_aws_ecs_learning_roadmap.docx.md`: longer learning roadmap/reference notes.
