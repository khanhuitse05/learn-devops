# M13: Observability with CloudWatch and CloudTrail

M13 focuses on seeing what the system is doing: logs, metrics, alarms,
dashboards, and audit history.

## Learning Goals

- Read application logs in CloudWatch Logs.
- Query logs with CloudWatch Logs Insights.
- Build dashboards for ECS, ALB, RDS, Redis, and API Gateway.
- Create useful alarms routed to SNS.
- Use CloudTrail to answer who changed what and when.

## Core Topics

### Logs

- Log group and log stream.
- Retention policy to control cost.
- Structured JSON logs are easier to query.
- Logs Insights for filtering and aggregation.

### Metrics and Alarms

- ECS CPU, memory, running task count.
- ALB request count, latency, target `5xx`, load balancer `5xx`.
- RDS CPU, storage, connections.
- Redis memory, evictions, CPU.
- NAT Gateway bytes and errors if used.

### CloudTrail

- Event history for recent account activity.
- Trails for longer-term audit storage.
- Useful for IAM, security group, route table, and resource deletion questions.

## Hands-On Lab

1. Confirm ECS app logs arrive in CloudWatch.
2. Set log retention to a short lab-friendly period.
3. Create dashboard widgets for ALB, ECS, and RDS.
4. Create alarms for ALB `5xx`, ECS high CPU, and RDS low storage.
5. Route alarm notifications to SNS.
6. Find a security group change in CloudTrail.
7. Write a one-page runbook for ALB `502/503`.

## Useful Commands

```bash
aws logs describe-log-groups --output table
aws logs tail /ecs/learn-devops-demo-node --since 1h
aws logs put-retention-policy \
  --log-group-name /ecs/learn-devops-demo-node \
  --retention-in-days 7
aws cloudwatch describe-alarms --output table
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=AuthorizeSecurityGroupIngress \
  --max-results 10
```

## Logs Insights Starter Queries

```sql
fields @timestamp, @message
| sort @timestamp desc
| limit 50
```

```sql
fields @timestamp, @message
| filter @message like /error|failed|timeout/i
| sort @timestamp desc
| limit 100
```

## Production Notes

- Alert on symptoms users feel, not only internal causes.
- Every alarm should have an owner and first action.
- Set retention intentionally; infinite logs can become expensive.
- Dashboards should show service health at a glance.
- Keep CloudTrail enabled for audit and incident investigation.

## Troubleshooting

- No logs: check ECS execution role and log configuration.
- Alarm does not fire: metric namespace/dimension/period may be wrong.
- Too many alerts: adjust thresholds or use composite alarms.
- Cannot find audit event: check region, account, event name, and time range.
