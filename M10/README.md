# M10: EventBridge and SNS

M10 introduces event-driven operations: scheduled jobs, event routing, and
notifications for humans or downstream systems.

## Learning Goals

- Create EventBridge rules and schedules.
- Send notifications through SNS topics and subscriptions.
- Route CloudWatch alarms to SNS.
- Trigger scheduled ECS tasks.
- Design simple event flows between services.

## Core Topics

### EventBridge

- Event bus receives events.
- Rule matches events or schedules.
- Target receives matched events.
- Input transformer can reshape payloads.

### SNS

- Topic receives messages.
- Subscription delivers messages to email, HTTPS endpoint, Lambda, SQS, or other
  supported protocols.
- Fan-out means one publish can notify multiple subscribers.

### Common Patterns

```text
CloudWatch Alarm -> SNS -> Email
EventBridge Schedule -> ECS Task
Application Event -> EventBridge -> Worker/Lambda/SQS
AWS API Event -> EventBridge Rule -> SNS
```

## Hands-On Lab

1. Create an SNS topic.
2. Subscribe your email and confirm the subscription.
3. Publish a test message.
4. Create an EventBridge schedule that sends a message to SNS.
5. Create an EventBridge rule for an AWS event, such as ECS task state change.
6. Design a scheduled ECS task for a daily maintenance job.

## Useful Commands

```bash
aws sns create-topic --name learn-devops-demo-alerts
aws sns list-topics --output table
aws sns subscribe \
  --topic-arn TOPIC_ARN \
  --protocol email \
  --notification-endpoint your-email@example.com
aws sns publish \
  --topic-arn TOPIC_ARN \
  --subject "M10 test" \
  --message "Hello from SNS"

aws events list-rules --output table
aws events list-targets-by-rule --rule RULE_NAME --output table
```

## Production Notes

- Confirm email subscriptions before relying on alerts.
- Keep alert messages actionable: service, severity, region, link, first action.
- Avoid noisy alerts that train people to ignore notifications.
- Use DLQ or retry strategy for event targets when losing an event matters.
- Be careful with schedules that trigger paid compute.

## Troubleshooting

- Email not received: subscription may be unconfirmed or filtered.
- Rule does not fire: event pattern, schedule, or target permission issue.
- Target fails: check EventBridge metrics and target service logs.
- Duplicate messages: event-driven systems should be idempotent.
