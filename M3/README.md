# M3: AWS Account, AWS CLI, and IAM

M3 prepares you to operate AWS safely. Before deploying anything, you need to
know who you are in AWS, what permissions you have, and how to avoid long-lived
or overpowered credentials.

## Learning Goals

- Configure AWS CLI profiles and regions.
- Use IAM users, groups, roles, policies, and trust policies.
- Apply least privilege.
- Understand temporary credentials.
- Distinguish ECS task role from ECS task execution role.

## Core Topics

### Account Safety

- Enable MFA for root and human users.
- Avoid root access keys.
- Create billing alerts and budgets before labs.
- Use separate dev/sandbox accounts when possible.

### AWS CLI

- Profiles live in `~/.aws/config` and `~/.aws/credentials`.
- Region affects where resources are created.
- `aws sts get-caller-identity` is the first command to run before any lab.

### IAM Concepts

- User: human or legacy programmatic identity.
- Group: collection of users.
- Role: identity assumed by AWS services, users, or CI systems.
- Permission policy: what actions are allowed or denied.
- Trust policy: who can assume a role.

### ECS Roles

- Execution role: used by ECS agent to pull ECR image and write CloudWatch logs.
- Task role: used by application code inside the container to call AWS APIs.

## Hands-On Lab

1. Install or verify AWS CLI.
2. Configure a dev profile.
3. Run identity checks.
4. Create a read-only IAM policy for one service.
5. Test that allowed actions work and unrelated actions fail.
6. Create an ECS execution role for later modules.

## Useful Commands

```bash
aws --version
aws configure --profile dev
AWS_PROFILE=dev aws sts get-caller-identity
aws configure list-profiles
aws configure list --profile dev
aws iam get-user
aws iam list-attached-user-policies --user-name YOUR_USER
```

## Least Privilege Checklist

- Start with read-only or narrowly scoped permissions.
- Grant write permissions only for required resources.
- Prefer roles and temporary credentials over static access keys.
- Do not store AWS keys in Git, Docker images, logs, or shell history.
- Rotate credentials immediately if exposed.

## Production Notes

- Use IAM Identity Center or federated access for humans when available.
- Use OIDC from CI providers instead of storing AWS access keys.
- Review CloudTrail after permission or credential incidents.
- Do not attach `AdministratorAccess` to app or pipeline roles by default.

## Troubleshooting

- `Unable to locate credentials`: profile not configured or env vars missing.
- `AccessDenied`: identity is correct, but policy lacks permission.
- Resource not found: check region and account.
- ECS pull image fails later: execution role may be missing ECR or logs
  permissions.
