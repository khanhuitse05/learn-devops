# M6: Amazon ECR Image Registry

M6 teaches how to store Docker images in Amazon ECR so ECS/Fargate can pull the
exact image version during deployment.

## Learning Goals

- Create private ECR repositories.
- Authenticate Docker to ECR with AWS CLI.
- Build, tag, push, and inspect images.
- Use immutable version tags such as commit SHA.
- Configure lifecycle policies and image scanning.

## Core Topics

### Repository

An ECR repository stores images for one application or component. For this repo,
the demo image can be stored as:

```text
learn-devops-demo-node
```

### Tags and Digests

- Tag: `latest`, `demo-001`, `main-abc1234`.
- Digest: immutable hash of the image content.
- Production deployments should prefer unique tags or digests over mutable
  `latest`.

### Lifecycle Policy

Use lifecycle policies to delete old images automatically and control storage
cost.

## Hands-On Lab

1. Create the repository.
2. Login Docker to ECR.
3. Build the local app image.
4. Tag it with a version.
5. Push the image.
6. Inspect the pushed image.
7. Add a lifecycle policy.

## Useful Commands

```bash
export AWS_REGION=ap-southeast-1
export AWS_DEFAULT_REGION="$AWS_REGION"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REPO=learn-devops-demo-node
ECR_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO"

aws ecr create-repository \
  --repository-name "$ECR_REPO" \
  --image-scanning-configuration scanOnPush=true

aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin \
    "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

docker build -t "$ECR_REPO:demo-001" ./server
docker tag "$ECR_REPO:demo-001" "$ECR_URI:demo-001"
docker push "$ECR_URI:demo-001"

aws ecr describe-images \
  --repository-name "$ECR_REPO" \
  --output table
```

## Lifecycle Policy Example

```json
{
  "rules": [
    {
      "rulePriority": 1,
      "description": "Keep only the latest 20 tagged images",
      "selection": {
        "tagStatus": "tagged",
        "countType": "imageCountMoreThan",
        "countNumber": 20
      },
      "action": {
        "type": "expire"
      }
    }
  ]
}
```

## Production Notes

- Keep build secrets out of images.
- Use image scanning and review critical vulnerabilities.
- Push images from CI with a role, not a personal access key.
- Use separate repositories or tag conventions for environments.

## Cleanup

```bash
aws ecr delete-repository \
  --repository-name learn-devops-demo-node \
  --force
```
