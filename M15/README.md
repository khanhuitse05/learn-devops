# M15: Capstone Project

M15 is the final project. The goal is to prove that you can design, deploy, and
operate a small production-like AWS architecture using the skills from M0-M14.

## Target Architecture

```text
Developer
  -> CI/CD pipeline
  -> Docker build
  -> ECR
  -> ECS/Fargate web service
  -> ALB + HTTPS + Route 53
  -> RDS PostgreSQL
  -> Redis
  -> optional EFS
  -> CloudWatch logs/metrics/alarms
  -> SNS notifications
```

## Required Deliverables

- Architecture diagram.
- CloudFormation root stack and nested stacks.
- ECR repository with versioned image.
- ECS web service behind ALB.
- ECS worker service or scheduled task.
- Private RDS connection.
- Redis connection or documented cache/queue design.
- CloudWatch dashboard.
- At least three alarms routed to SNS.
- Backup and restore drill notes.
- Operations README and incident runbook.

## Suggested Build Order

1. Prepare account, budget, region, and AWS CLI.
2. Build local app and Docker image.
3. Create ECR repository.
4. Create VPC, public/private subnets, route tables, and security groups.
5. Create RDS and Redis in private subnets.
6. Create ALB and target group.
7. Create ECS cluster, task definition, and service.
8. Configure Route 53 and ACM HTTPS.
9. Add CI/CD deployment.
10. Add autoscaling.
11. Add CloudWatch dashboard, alarms, and SNS.
12. Add backup/restore drill.
13. Run cleanup plan for non-production resources.

## Acceptance Criteria

- `/health` works through the public HTTPS domain.
- ECS service runs at least one healthy task.
- App can connect to private RDS.
- Worker or scheduled task can run without public inbound access.
- Deployment can update image tag repeatably.
- Rollback path is documented.
- Dashboard shows ALB, ECS, and database health.
- Alarms trigger a confirmed SNS subscription.
- Restore drill proves backup is usable.
- Cost cleanup list identifies every paid resource.

## Final Runbook Topics

- How to deploy a new version.
- How to roll back to the previous task definition.
- How to debug ALB `502/503`.
- How to debug ECS task failures.
- How to rotate a secret safely.
- How to restore database snapshot into dev.
- How to scale service up or down.
- How to clean up lab resources.

## Common Review Questions

- Which resources are public and why?
- Which resources are private and why?
- What happens if one AZ fails?
- How does the app receive secrets?
- What metric tells you the service is unhealthy?
- How do you know backups work?
- What is the highest-cost resource in the design?

## Completion Checklist

- Architecture is diagrammed and explained.
- Infrastructure is reproducible.
- Deployment is automated.
- Observability is present.
- Secrets are not hardcoded.
- Data layer is private.
- Backups are tested.
- Cleanup steps are documented.
