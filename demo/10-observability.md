# 10 - Observability

## Objective

Monitor the app using CloudWatch Logs, metrics, alarms, and a basic dashboard to know whether the service is running well.

## Prerequisites

- Completed [step 07](07-ecs-fargate-service.md): ECS service still exists and task is running to generate logs and metrics.
- Should keep ALB from [step 08](08-alb-public-entry.md) to create test requests and view ALB metrics.
- If you want to test database endpoints, completed [step 09](09-secrets-and-env.md).
- If ECS service or ALB was cleaned up: rerun the corresponding step before observing metrics.

## Knowledge to understand

- Containers should log to stdout/stderr.
- ECS awslogs driver sends logs to CloudWatch Logs.
- ALB has target response, 4xx, and 5xx metrics.
- `/test-error` generates a safe HTTP 500 to demo error logs, ALB 5xx metrics, and alarms without restarting the task.
- CloudWatch Dashboard gathers important metrics on one screen.
- Alarm helps alert when the service is unhealthy or errors increase.

## Estimated cost

- CloudWatch Logs charges for ingest and storage.
- CloudWatch Alarms have a per-alarm charge.
- For a small lab, costs are usually low but still delete log groups/alarms after the demo.

## Cost warning for paid services

Log groups left long can accumulate storage. Set a short retention, e.g., 1-3 days for the lab.

## Console steps

1. Go to CloudWatch Logs.
2. Open the log group `/ecs/learn-devops-demo-node`.
3. View the log stream of the running task.
4. Set retention to 1 or 3 days.
5. Go to CloudWatch Metrics.
6. View ECS service metrics: CPU, memory.
7. View ALB target group metrics: healthy host count, HTTP 5xx.
8. Create a dashboard `learn-devops-demo-dashboard` with CPU, memory, healthy host count, and ALB 5xx.
9. Create a simple alarm:
   - ECS running task count < 1.
   - Or ALB target 5xx > 0 within a few minutes.

## CLI check/debug commands

View recent logs:

```bash
aws logs tail /ecs/learn-devops-demo-node --since 30m
```

Set retention:

```bash
aws logs put-retention-policy \
  --log-group-name /ecs/learn-devops-demo-node \
  --retention-in-days 3
```

List alarms:

```bash
aws cloudwatch describe-alarms \
  --alarm-name-prefix learn-devops-demo \
  --query 'MetricAlarms[].{Name:AlarmName,State:StateValue}' \
  --output table
```

List dashboards:

```bash
aws cloudwatch list-dashboards \
  --dashboard-name-prefix learn-devops-demo
```

Test app logs via ALB:

```bash
curl -i "http://$ALB_DNS/health"
curl -i "http://$ALB_DNS/flow"
curl -i "http://$ALB_DNS/test-error"
curl -i "http://$ALB_DNS/health"
```

After `/test-error`, `/health` must still return HTTP `200`. This way you have 5xx data to view logs/metrics without crashing the ECS task.

## Expected result

- CloudWatch Logs has request logs from the app.
- `/test-error` generates error logs and HTTP 500 data to check ALB 5xx metrics/alarms.
- Log retention is not left at the default `Never expire`.
- Have a demo dashboard or know how to create a dashboard from metrics.
- Have at least one demo alarm or know how to create an alarm from metrics.

## Cleanup

- If still testing alarms and logs: keep resources until testing is complete.
- If continuing: move to [step 11](11-elasticache-redis.md) to add a private Redis cache.
- If demo is complete: move to [step 15](15-cleanup-cost-control.md) to fully clean up resources in order.

Delete demo alarm:

```bash
aws cloudwatch delete-alarms \
  --alarm-names learn-devops-demo-ecs-running-task-low
```

Delete log group after deleting ECS service:

```bash
aws logs delete-log-group \
  --log-group-name /ecs/learn-devops-demo-node
```

Delete demo dashboard:

```bash
aws cloudwatch delete-dashboards \
  --dashboard-names learn-devops-demo-dashboard
```

## Troubleshooting

- No logs visible: check task definition log configuration and execution role.
- Too many logs: reduce test requests, set short retention.
- Alarm not changing state immediately: CloudWatch needs a few datapoints depending on period/evaluation.