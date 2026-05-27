# M7: Amazon ECS and Fargate

M7 is the core runtime module. You will deploy containerized web and worker
services to ECS/Fargate, connect them to logs, and update them safely.

## Learning Goals

- Create ECS clusters, task definitions, and services.
- Understand Fargate CPU/memory sizing.
- Configure ports, environment variables, secrets, health checks, and logs.
- Attach a web service to an ALB target group.
- Debug stopped tasks and perform rolling deploys and rollbacks.

## Core Topics

### ECS Building Blocks

- Cluster: logical place where services/tasks run.
- Task definition: versioned template for containers.
- Task: running copy of a task definition.
- Service: keeps desired number of tasks running.
- Capacity provider: Fargate or EC2 capacity strategy.

### Task Definition

Important fields:

- Container image URI from ECR.
- CPU and memory.
- Port mappings.
- Environment variables.
- Secrets from Secrets Manager or SSM Parameter Store.
- Log configuration to CloudWatch Logs.
- Task role and execution role.

### Web vs Worker Service

- Web service: receives traffic from ALB and needs health checks.
- Worker service: no public endpoint; consumes queue/event/job workload.
- Worker shutdown must be graceful so in-flight jobs are not lost.

## Hands-On Lab

1. Create ECS cluster.
2. Register task definition for the demo app image.
3. Create CloudWatch log group.
4. Create service with desired count `1`.
5. Attach to ALB target group from M5.
6. Update image tag and watch a rolling deployment.
7. Roll back to previous task definition revision.

## Useful Commands

```bash
aws ecs describe-clusters --clusters learn-devops-demo-cluster --output table
aws ecs describe-services \
  --cluster learn-devops-demo-cluster \
  --services learn-devops-demo-node-service \
  --output table

aws ecs list-tasks \
  --cluster learn-devops-demo-cluster \
  --service-name learn-devops-demo-node-service

aws ecs describe-tasks \
  --cluster learn-devops-demo-cluster \
  --tasks TASK_ARN

aws logs tail /ecs/learn-devops-demo-node --since 30m
```

## Production Notes

- Keep `/health` lightweight and independent of database when used by ALB.
- Do not use oversized CPU/memory settings without measuring.
- Use at least two tasks across multiple AZs for important services.
- Verify secrets, env vars, ports, and log group before deployment.
- ECS service will keep tasks running until scaled to zero or deleted.

## Troubleshooting

- `CannotPullContainerError`: ECR image URI, auth, or execution role issue.
- `Essential container in task exited`: app crashed; read logs.
- No logs: execution role or log config issue.
- ALB target unhealthy: wrong port, wrong health path, SG blocked, or app not
  listening on `0.0.0.0`.
- Deployment stuck: desired count, capacity, health check, or min/max healthy
  percent issue.
