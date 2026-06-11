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

Check application logs:

1. Go to AWS Console -> CloudWatch -> Logs -> Log groups.
2. Open log group `/ecs/learn-devops-demo-node`.
3. Open the newest log stream. It usually contains the ECS task ID in the stream name.
4. Send a few requests to the app through the ALB, for example `/health`, `/flow`, and `/test-error`.
5. Refresh the log stream and confirm new request logs appear.
6. In the log group page, select Actions -> Edit retention setting.
7. Set retention to `3 days` or `1 day`, then save.

Check service and load balancer metrics:

1. Go to CloudWatch -> Metrics -> All metrics.
2. For ECS metrics:
   - Open ECS -> ClusterName, ServiceName.
   - Select metrics for `learn-devops-demo-cluster` and `learn-devops-demo-node-service`.
   - Useful metrics: CPU utilization, memory utilization, and running task count if available.
3. For ALB metrics:
   - Go back to All metrics.
   - Open ApplicationELB.
   - Check metrics by LoadBalancer and by TargetGroup.
   - Useful metrics: `HealthyHostCount`, `HTTPCode_Target_5XX_Count`, and `TargetResponseTime`.
4. If the 5xx metric is empty, call `/test-error` through the ALB, wait 1-2 minutes, then refresh the metric graph.

Create a simple dashboard:

1. Go to CloudWatch -> Dashboards.
2. Select Create dashboard.
3. Dashboard name: `learn-devops-demo-dashboard`.
4. Add a line widget for ECS CPU utilization.
5. Add a line widget for ECS memory utilization.
6. Add a number or line widget for ALB target group `HealthyHostCount`.
7. Add a line widget for ALB `HTTPCode_Target_5XX_Count`.
8. Save the dashboard.

Create one demo alarm:

1. Go to CloudWatch -> Alarms -> All alarms.
2. Select Create alarm.
3. Select metric.
4. Choose one of these alarm options:
   - ECS health option: ECS -> ClusterName, ServiceName -> running task count is lower than `1`.
   - ALB error option: ApplicationELB -> per TargetGroup metric -> `HTTPCode_Target_5XX_Count` is greater than `0`.
5. For the lab, use a short period such as `1 minute` and `1` evaluation datapoint.
6. Notification can be skipped if you do not want to configure SNS.
7. Alarm name: `learn-devops-demo-ecs-running-task-low` for ECS, or `learn-devops-demo-alb-5xx`.
8. Create the alarm.

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
