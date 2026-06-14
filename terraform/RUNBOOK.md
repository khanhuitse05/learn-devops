# Incident Runbook - Terraform Mini Architecture

Use this when the app is unhealthy or a deployment fails.

## First 5 Minutes

Set common variables:

```bash
cd terraform
ALB_URL=$(terraform output -raw alb_url)
CLUSTER=$(terraform output -raw cluster_name)
SERVICE=$(terraform output -raw service_name)
TG_ARN=$(terraform output -raw target_group_arn)
LOG_GROUP=$(terraform output -raw log_group_name)
```

Check user-facing health:

```bash
curl -i "$ALB_URL/health"
curl -i "$ALB_URL/api/db/health"
```

Check ALB targets:

```bash
aws elbv2 describe-target-health --target-group-arn "$TG_ARN"
```

Check ECS events:

```bash
aws ecs describe-services \
  --cluster "$CLUSTER" \
  --services "$SERVICE" \
  --query 'services[0].{desired:desiredCount,running:runningCount,pending:pendingCount,events:events[0:5]}'
```

Check logs:

```bash
aws logs tail "$LOG_GROUP" --since 15m
```

## Symptom: ALB Returns 503

Likely causes:

- No healthy ECS targets.
- ECS task is not running.
- Container port or health check path is wrong.
- Security group blocks ALB to ECS.

Recovery:

```bash
aws ecs update-service \
  --cluster "$CLUSTER" \
  --service "$SERVICE" \
  --force-new-deployment
```

## Symptom: ECS Task Keeps Restarting

Check stopped tasks:

```bash
TASKS=$(aws ecs list-tasks \
  --cluster "$CLUSTER" \
  --service-name "$SERVICE" \
  --desired-status STOPPED \
  --query 'taskArns[0:5]' \
  --output text)

aws ecs describe-tasks \
  --cluster "$CLUSTER" \
  --tasks $TASKS \
  --query 'tasks[*].{stoppedReason:stoppedReason,containers:containers[*].reason}'
```

Likely causes:

- Bad image tag.
- App startup crash.
- ECS execution role cannot read SSM parameter.
- `DATABASE_URL` is invalid.

Rollback:

```bash
terraform apply -var="image_tag=demo-001"
```

## Symptom: Database Health Fails

```bash
curl -i "$ALB_URL/api/db/health"
aws logs tail "$LOG_GROUP" --since 10m
```

Check RDS:

```bash
aws rds describe-db-instances \
  --db-instance-identifier learn-devops-demo-postgres \
  --query 'DBInstances[0].{status:DBInstanceStatus,endpoint:Endpoint.Address}'
```

Likely causes:

- RDS is still creating or rebooting.
- Security group no longer allows ECS to RDS.
- Wrong DB password in SSM parameter.

Recovery:

```bash
terraform plan
terraform apply
aws ecs update-service --cluster "$CLUSTER" --service "$SERVICE" --force-new-deployment
```

## Safe Practice Incident

Generate one intentional app error:

```bash
curl -i "$ALB_URL/test-error"
aws logs tail "$LOG_GROUP" --since 5m
```

Expected:

- HTTP `500`
- ECS service remains healthy
- Error appears in CloudWatch logs