# 00 - Prerequisites

## Objective

Prepare a safe AWS account before creating any resources. After this step you will have a working AWS CLI, know the region in use, have a budget alarm, and a naming convention for cleanup.

## Trainer Notes

- Keep the AWS region consistent throughout the entire demo, default to `ap-southeast-1`.
- Use the resource prefix `learn-devops-demo-*` for easy cleanup.
- Do not publicly expose database or cache.
- Later labs may create paid resources: RDS, Fargate, ALB, ElastiCache, Grafana, CloudWatch, and Secrets Manager.
- After each practice session, finish with [15 - Cleanup And Cost Control](15-cleanup-cost-control.md).

## Prerequisites

- Have an AWS account and access to the AWS Console.
- Have an email to receive cost alerts.
- Local machine has a terminal to install and configure AWS CLI.

## Knowledge to understand

- Root account should only be used for account administration, not daily use.
- IAM user/role should use least privilege.
- Budget alarms help detect costs early.
- Region determines where resources are created.

## Estimated cost

- IAM, MFA, AWS CLI: free.
- AWS Budgets: typically has a free quota for basic budgets; check the Billing page if your account has different conditions.

## Cost warning for paid services

No compute/database created at this step. However, create a budget before later labs because RDS, NAT Gateway, ALB, and Fargate can charge hourly.

## Console steps

1. Sign in to the AWS Console.
2. Enable MFA for the root user.
3. Go to Billing and Cost Management.
4. Create a budget named `learn-devops-demo-budget`.
5. Set a small threshold for the lab, e.g., 5-10 USD.
6. Add an email to receive alerts.
7. Select the default region for the lab: `ap-southeast-1`.

## CLI check/debug commands

```bash
aws configure
export AWS_REGION=ap-southeast-1
export AWS_DEFAULT_REGION="$AWS_REGION"
export DEMO_PREFIX=learn-devops-demo

aws sts get-caller-identity
aws configure list
```

Check region:

```bash
aws ec2 describe-availability-zones \
  --region "$AWS_REGION" \
  --query 'AvailabilityZones[].ZoneName' \
  --output table
```

## Expected result

- `aws sts get-caller-identity` returns `Account`, `Arn`, `UserId`.
- Console has a budget alarm.
- You know exactly which region is in use.

## Cleanup

- If continuing: keep the budget to protect the account in later labs.
- If stopping here: still keep the budget. Budget does not create continuously running AWS resources.

## Troubleshooting

- `Unable to locate credentials`: rerun `aws configure` or check the profile.
- `AccessDenied`: user/role does not have permission to call the service.
- Wrong region: re-export `AWS_REGION` and `AWS_DEFAULT_REGION`.