# M14: Security, Secrets, Backup, Disaster Recovery, and Cost

M14 turns a working deployment into something closer to production: protected
secrets, encryption, least privilege, tested backups, incident readiness, and
cost control.

## Learning Goals

- Move credentials into Secrets Manager or SSM Parameter Store.
- Understand KMS encryption and key policies at a practical level.
- Apply security baselines for ECS, RDS, Redis, EFS, IAM, and networking.
- Create and test backup/restore procedures.
- Track and reduce AWS cost.

## Core Topics

### Secrets

- Secrets Manager for rotated secrets such as DB passwords.
- SSM Parameter Store for configuration and lower-cost parameters.
- ECS task definitions can inject secrets as environment variables.
- Never commit secrets to Git or bake them into Docker images.

### Encryption

- Encrypt data at rest for RDS, EFS, logs, and secrets where applicable.
- Use TLS in transit for public endpoints and data services when supported.
- Understand who can use a KMS key through IAM and key policy.

### Backup and DR

- RDS automated backups and snapshots.
- EFS backup plans.
- EBS snapshots and AMIs for EC2.
- Restore drills with documented verification steps.

### Cost

- NAT Gateway hourly and data processing cost.
- Fargate vCPU/memory hours.
- RDS instance hours and storage.
- CloudWatch log ingestion and retention.
- Orphaned EBS volumes, snapshots, load balancers, and Elastic IPs.

## Hands-On Lab

1. Move DB password from plain env var to Secrets Manager.
2. Grant ECS task execution role permission to read the secret.
3. Verify app starts using the secret.
4. Create an RDS snapshot and restore to a dev DB.
5. Set log retention policy.
6. Review AWS Cost Explorer or billing dashboard.
7. Write a monthly cost checklist.

## Useful Commands

```bash
aws secretsmanager list-secrets --output table
aws secretsmanager describe-secret --secret-id SECRET_ID
aws kms list-keys --output table
aws backup list-backup-vaults --output table
aws rds describe-db-snapshots --output table
aws ce get-cost-and-usage \
  --time-period Start=2026-05-01,End=2026-06-01 \
  --granularity MONTHLY \
  --metrics UnblendedCost
```

## Production Notes

- Secret rotation can break apps if connection pools and deployments are not
  prepared.
- KMS key policy mistakes can block decrypt and cause outages.
- Backup is incomplete until restore is tested.
- Security group changes should be reviewed like code.
- Use budgets and alarms before running expensive labs.

## Monthly Checklist

- Review active NAT Gateways, ALBs, RDS instances, and ECS services.
- Delete unused ECR images and old log groups.
- Check unattached EBS volumes and old snapshots.
- Verify backup jobs succeeded.
- Review IAM access and old access keys.

## Troubleshooting

- App cannot read secret: check execution role, secret ARN, and KMS permission.
- Decrypt denied: inspect KMS key policy and IAM policy.
- Restore fails: check snapshot status, subnet group, storage, and engine
  version.
- Unexpected bill: inspect Cost Explorer by service and tag.
