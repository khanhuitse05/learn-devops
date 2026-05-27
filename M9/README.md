# M9: Auto Scaling for ECS Services

M9 teaches how to let ECS services add or remove tasks based on load while
controlling cost and avoiding unstable scaling behavior.

## Learning Goals

- Understand desired count, min capacity, and max capacity.
- Configure target tracking and step scaling.
- Choose metrics for web and worker services.
- Understand cooldown and scale-in risk.
- Test scaling behavior safely.

## Core Topics

### Scaling Dimensions

- Desired count: current number of tasks ECS tries to run.
- Minimum capacity: lower bound.
- Maximum capacity: upper bound to protect budget and dependencies.

### Common Metrics

- ECS CPU utilization.
- ECS memory utilization.
- ALB request count per target.
- Queue length or job backlog for workers.
- Custom CloudWatch metrics when built-in metrics are not enough.

### Scaling Policies

- Target tracking: keep a metric near a target value.
- Step scaling: add/remove capacity based on alarm thresholds.
- Scheduled scaling: scale at known business hours.

## Hands-On Lab

1. Enable service auto scaling for an ECS service.
2. Set min `1`, max `3` for a low-cost lab.
3. Add CPU target tracking around `60-70%`.
4. Generate light load and observe scale out.
5. Stop load and observe scale in.
6. Design a worker scaling policy based on queue length.

## Useful Commands

```bash
aws application-autoscaling describe-scalable-targets \
  --service-namespace ecs

aws application-autoscaling describe-scaling-policies \
  --service-namespace ecs

aws cloudwatch describe-alarms --output table

aws ecs describe-services \
  --cluster learn-devops-demo-cluster \
  --services learn-devops-demo-node-service \
  --query 'services[].{Desired:desiredCount,Running:runningCount,Pending:pendingCount}' \
  --output table
```

## Production Notes

- Set max capacity deliberately to avoid cost spikes.
- Make sure database and downstream services can handle scale out.
- Avoid aggressive scale in for workers unless shutdown is graceful.
- Scaling does not fix slow code or a saturated database by itself.
- Watch deployment behavior when auto scaling and rolling deploys overlap.

## Troubleshooting

- Service does not scale: check scalable target, policy, metric, and IAM
  service-linked role.
- Scale out happens but tasks fail: capacity, image pull, secrets, or network
  issue.
- Scale in too fast: cooldown too short or target too aggressive.
- Cost rises unexpectedly: max capacity too high or metric noisy.
