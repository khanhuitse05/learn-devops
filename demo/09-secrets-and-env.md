# 09 - Secrets And Environment Variables

## Objective

Inject the RDS connection string into the existing server image without modifying code or rebuilding the image. Prefer SSM Parameter Store; use Secrets Manager when you want more proper secret management.

## Prerequisites

- Completed [step 05](05-rds-postgresql.md): RDS still exists and has an endpoint.
- Completed [step 07](07-ecs-fargate-service.md): ECS service and task definition still exist.
- Should keep ALB from [step 08](08-alb-public-entry.md) to test the API externally.
- ECS task execution role can be updated with permission to read SSM parameters or Secrets Manager secrets.
- If RDS was cleaned up: rerun [step 05](05-rds-postgresql.md). If ECS service was cleaned up: rerun [step 07](07-ecs-fargate-service.md).

## Knowledge to understand

- Env vars are usually visible in task definition revisions, should not contain plain text passwords.
- SSM Parameter Store `String` is easy for labs but stores the value unencrypted; `SecureString` is safer if you want encryption via KMS.
- Secrets Manager has better secret lifecycle/rotation features but charges per secret.
- ECS task execution role needs permission to read the secret/parameter.
- The app already reads `DATABASE_URL`; this step only configures runtime.

## Estimated cost

- SSM Parameter Store standard parameters are usually the cost-effective choice.
- Secrets Manager charges per secret/month and API calls.

## Cost warning for paid services

Secrets Manager has a recurring fee per secret. For a cost-saving lab, use SSM Parameter Store if rotation is not needed.

## Console steps

Cost-saving option with SSM via the Create parameter screen:

1. Go to Systems Manager -> Parameter Store.
2. Create parameter.
3. Name: `/learn-devops-demo/db-url`.
4. Description: leave empty.
5. Tier: select `Standard`.
6. Type: select `String`.
7. Data type: keep `text`.
8. Value: PostgreSQL connection string to RDS, for example:

   ```text
   postgres://devops_demo:YOUR_PASSWORD@YOUR_RDS_ENDPOINT:5432/devops_demo?sslmode=require
   ```

9. Tags: leave empty if just doing the lab.
10. Click `Create parameter`.
11. Go to IAM, add parameter read permission for the ECS task execution role:
    - Open the current ECS task definition revision.
    - In the Overview section, find `Task execution role`.
    - Click the role `ecsTaskExecutionRole` to open the IAM role.
    - Go to the Permissions tab.
    - Click Add permissions -> Create inline policy.
    - Select the JSON tab, delete the old content and paste the policy:

      ```json
      {
        "Version": "2012-10-17",
        "Statement": [
          {
            "Effect": "Allow",
            "Action": [
              "ssm:GetParameter",
              "ssm:GetParameters"
            ],
            "Resource": "arn:aws:ssm:ap-southeast-1:ACCOUNT_ID:parameter/learn-devops-demo/db-url"
          }
        ]
      }
      ```

    - Change `ACCOUNT_ID` to your AWS account ID.
    - Click Next.
    - Policy name: `ReadLearnDevopsDemoDbUrl`.
    - Click Create policy.
12. Update the ECS task definition to inject the secret into the env var `DATABASE_URL`.
13. Deploy the new revision.

Note: `String` matches the screenshot but the value is not encrypted. If you want more security, select `SecureString` instead of `String`; the remaining steps stay the same.

Secrets Manager option:

1. Go to Secrets Manager.
2. Store a new secret.
3. Secret type: Other type of secret.
4. Key/value or plain text containing `DATABASE_URL`.
5. Secret name: `learn-devops-demo/db-url`.
6. Update ECS task definition to use the secret.

## CLI check/debug commands

Create SSM parameter as `String` matching the screenshot:

```bash
aws ssm put-parameter \
  --name /learn-devops-demo/db-url \
  --type String \
  --value "postgres://devops_demo:YOUR_PASSWORD@YOUR_RDS_ENDPOINT:5432/devops_demo?sslmode=require" \
  --overwrite
```

Read parameter to check local permissions:

```bash
aws ssm get-parameter \
  --name /learn-devops-demo/db-url \
  --with-decryption \
  --query 'Parameter.Name' \
  --output text
```

After deploying the new task definition revision, test via ALB:

```bash
curl -i "http://$ALB_DNS/api/db/health"
curl -i "http://$ALB_DNS/api/orders"
```

Minimal policy for role to read parameter:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParameters"
      ],
      "Resource": "arn:aws:ssm:ap-southeast-1:ACCOUNT_ID:parameter/learn-devops-demo/*"
    }
  ]
}
```

## Expected result

- Task definition does not contain DB password in plain text.
- ECS task receives `DATABASE_URL` from SSM or Secrets Manager.
- App connects to RDS successfully after deploying the new revision.
- `/api/db/health` and `/api/orders` return HTTP 200 via ALB.

## Cleanup

- If continuing to step 10: keep SSM parameter or secret so the ECS task can continue connecting to RDS.
- If ending the lab: delete the parameter or secret after deleting the ECS service. Secrets Manager can incur charges over time for storing the secret.

Delete SSM parameter if created:

```bash
aws ssm delete-parameter --name /learn-devops-demo/db-url
```

Delete Secrets Manager secret if created:

```bash
aws secretsmanager delete-secret \
  --secret-id learn-devops-demo/db-url \
  --force-delete-without-recovery
```

## Troubleshooting

- Task doesn't start due to secret access denied: check execution role permission.
- App receives empty env: check secret mapping in the task definition.
- RDS auth error: secret value has wrong password, host, or database name.