# 15 - Cleanup And Cost Control

## Objective

Delete all demo resources to stop incurring costs, then check Billing.

## Prerequisites

- Only run this step when you want to end the demo or pause long enough to need to stop costs.
- AWS CLI logged into the correct account and region used for the lab.
- No need to recreate resources already cleaned up in earlier steps. Delete any remaining resources per the checklist below.
- Confirm no production resources or non-lab resources use the `learn-devops-demo` prefix.

## Knowledge to understand

- Some resources depend on each other so they must be deleted in order.
- RDS, ALB, NAT Gateway, Fargate, ElastiCache, and Amazon Managed Grafana are the main cost sources in this lab.
- ECR, ElastiCache, Amazon Managed Grafana, CloudWatch Logs, snapshots, Elastic IP can also still incur costs if forgotten.

## Estimated cost

The cleanup step helps reduce costs. After cleanup, still check Billing because cost explorer can be delayed by a few hours to over a day.

## Cost warning for paid services

Prioritize checking and deleting:

- NAT Gateway.
- RDS instance and snapshots not needed.
- ALB.
- ECS services with desired count > 0.
- ECR images.
- ElastiCache Redis cluster/subnet group.
- Amazon Managed Grafana workspace.
- CloudWatch log groups.
- Unattached Elastic IPs.

## Console steps

This is a consolidated cleanup checklist for resources created from step 00 to step 14. Delete in order:

1. ECS: set desired count to `0`, delete service, deregister task definition revisions if not in use, and delete cluster.
2. EC2 Load Balancers: delete ALB.
3. Target Groups: delete target group.
4. RDS: delete DB instance, skip final snapshot if you don't need to keep data. Wait for the DB to be fully deleted before cleaning up VPC.
5. RDS: delete DB subnet group if created specifically for the lab.
6. ECR: delete repository and images.
7. ElastiCache: delete Redis cluster/cache, subnet group, and related security group rules.
8. Amazon Managed Grafana: delete demo workspace.
9. Systems Manager Parameter Store: delete `/learn-devops-demo/db-url` if created.
10. Secrets Manager: delete `learn-devops-demo/db-url` if created.
11. CloudWatch: delete demo dashboard, log group, and alarm.
12. IAM: detach demo policy from ECS execution role; delete role if the role was created specifically for the lab and no other resources use it. (btw IAM roles and IAM permissions/policies do not have direct cost. You clean them up mostly for security and tidiness, not billing.)
  - Roles: ecsTaskExecutionRole
  - Permissions: ReadLearnDevopsDemoDbUrl
13. VPC:
    - Delete NAT Gateway if exists.
    - Release Elastic IP if exists.
    - Delete security groups.
    - Delete subnets.
    - Detach/delete Internet Gateway.
    - Delete VPC.
16. Local Docker: run `docker compose down -v` in `./server` if you no longer need local PostgreSQL.
17. Billing: check Free Tier, Bills, Cost Explorer.

The budget alarm from step 00 can be kept to continue protecting the account.

## CLI check/debug commands

Ensure `AWS_REGION` matches the region used in previous steps. For example, Singapore is `ap-southeast-1`:

```bash
AWS_REGION=ap-southeast-1
export AWS_DEFAULT_REGION="$AWS_REGION"
```

Find ECS services:

```bash
aws ecs list-clusters
aws ecs list-services --cluster learn-devops-demo-cluster
```

Find ALB:

```bash
aws elbv2 describe-load-balancers \
  --query 'LoadBalancers[?contains(LoadBalancerName, `learn-devops-demo`)].{Name:LoadBalancerName,DNS:DNSName}' \
  --output table
```

Find target group:

```bash
aws elbv2 describe-target-groups \
  --query 'TargetGroups[?contains(TargetGroupName, `learn-devops-demo`)].TargetGroupName' \
  --output table
```

Find RDS:

```bash
aws rds describe-db-instances \
  --query 'DBInstances[?contains(DBInstanceIdentifier, `learn-devops-demo`)].{Id:DBInstanceIdentifier,Status:DBInstanceStatus}' \
  --output table
```

Find ECR:

```bash
aws ecr describe-repositories \
  --query 'repositories[?contains(repositoryName, `learn-devops-demo`)].repositoryName' \
  --output table
```

Find ElastiCache Redis:

```bash
aws elasticache describe-cache-clusters \
  --query 'CacheClusters[?contains(CacheClusterId, `learn-devops-demo`)].{Id:CacheClusterId,Status:CacheClusterStatus,Engine:Engine}' \
  --output table
```

Find Amazon Managed Grafana workspace:

```bash
aws grafana list-workspaces \
  --query 'workspaces[?contains(name, `learn-devops-demo`)].{Id:id,Name:name,Status:status}' \
  --output table
```

Find CloudFormation stack:

```bash
aws cloudformation list-stacks \
  --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE ROLLBACK_COMPLETE \
  --query 'StackSummaries[?contains(StackName, `learn-devops-demo`)].{Name:StackName,Status:StackStatus}' \
  --output table
```

Find SSM parameter:

```bash
aws ssm describe-parameters \
  --parameter-filters "Key=Name,Option=BeginsWith,Values=/learn-devops-demo/" \
  --query 'Parameters[].Name' \
  --output table
```

Find Secrets Manager secret:

```bash
aws secretsmanager list-secrets \
  --query 'SecretList[?contains(Name, `learn-devops-demo`)].Name' \
  --output table
```

Find NAT Gateway:

```bash
aws ec2 describe-nat-gateways \
  --filter "Name=tag:Name,Values=learn-devops-demo*" \
  --query 'NatGateways[].{Id:NatGatewayId,State:State}' \
  --output table
```

Find unattached Elastic IP:

```bash
aws ec2 describe-addresses \
  --query 'Addresses[?AssociationId==null].{PublicIp:PublicIp,AllocationId:AllocationId}' \
  --output table
```

Find log groups:

```bash
aws logs describe-log-groups \
  --log-group-name-prefix /ecs/learn-devops-demo \
  --query 'logGroups[].logGroupName' \
  --output table
```

Find CloudWatch alarm:

```bash
aws cloudwatch describe-alarms \
  --alarm-name-prefix learn-devops-demo \
  --query 'MetricAlarms[].AlarmName' \
  --output table
```

Find CloudWatch dashboard:

```bash
aws cloudwatch list-dashboards \
  --dashboard-name-prefix learn-devops-demo \
  --query 'DashboardEntries[].DashboardName' \
  --output table
```

## Expected result

- No ECS service running.
- No demo ALB.
- No demo RDS if you don't want to keep the DB.
- No demo ECR repository and images.
- No demo ElastiCache Redis.
- No demo Amazon Managed Grafana workspace.
- No demo CloudFormation stack.
- No demo Terraform-managed resources.
- No demo SSM parameter or Secrets Manager secret.
- No demo CloudWatch dashboard, log group, and alarm.
- No demo NAT Gateway.
- No unused Elastic IPs.
- No demo VPC after all dependencies are deleted.
- Billing does not continue to increase abnormally in the following days.

## Cleanup

This is the main cleanup step. After completing, keep note files or screenshots if you want to log your learning.

## Troubleshooting

- VPC cannot be deleted: ENIs from ALB/ECS/RDS still exist or NAT Gateway not yet fully deleted.
- Security Group cannot be deleted: resource still attached or another SG references it.
- RDS delete takes long: wait for status to change to `deleting`, it can take many minutes.
- Cost still shows: Billing is often delayed, check again after a few hours or the next day.