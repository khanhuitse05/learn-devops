# M12: CI/CD for ECR and ECS

M12 automates release flow: test code, build image, push to ECR, update ECS, and
notify the team.

## Learning Goals

- Design a pipeline with source, test, build, scan, push, deploy, and notify
  stages.
- Use GitHub Actions or AWS CodePipeline/CodeBuild.
- Use OIDC or roles instead of long-lived AWS keys.
- Deploy ECS task definition updates.
- Plan rollback and production approval.

## Core Pipeline

```text
Git push
  -> tests
  -> Docker build
  -> image scan
  -> push ECR tag
  -> render ECS task definition
  -> deploy ECS service
  -> notify success/failure
```

## GitHub Actions Example Shape

```yaml
name: deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-deploy-role
          aws-region: ap-southeast-1
      - name: Login to ECR
        uses: aws-actions/amazon-ecr-login@v2
      - name: Build and push image
        run: |
          docker build -t "$ECR_URI:$GITHUB_SHA" ./server
          docker push "$ECR_URI:$GITHUB_SHA"
```

## Hands-On Lab

1. Create a deploy IAM role for CI.
2. Configure GitHub OIDC trust or CodeBuild service role.
3. Build and push image to ECR.
4. Render ECS task definition with the new image tag.
5. Deploy ECS service.
6. Add notification to SNS or Slack.
7. Practice rollback to previous image/task definition.

## Useful Commands

```bash
aws ecs describe-task-definition --task-definition FAMILY
aws ecs update-service \
  --cluster learn-devops-demo-cluster \
  --service learn-devops-demo-node-service \
  --task-definition TASK_DEFINITION
aws ecs wait services-stable \
  --cluster learn-devops-demo-cluster \
  --services learn-devops-demo-node-service
```

## Production Notes

- Use manual approval, canary, or blue/green for critical services.
- Keep secrets out of logs.
- Use unique image tags for every build.
- Run migrations deliberately and make them backward-compatible where possible.
- Store task definition templates in Git.

## Troubleshooting

- CI cannot assume role: check OIDC provider, trust policy, branch condition.
- Push denied: role lacks ECR permissions.
- Deploy succeeds but app fails: task definition or runtime config problem.
- Pipeline hangs: ECS service cannot become stable; inspect task failures and
  target health.
