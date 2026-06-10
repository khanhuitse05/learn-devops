# 06 - ECR Image Registry

## Objective

Build a complete Docker image from `./server` and push it to Amazon ECR so ECS can pull the image. Later steps only configure infrastructure and secrets, without adding code to the image.

## Prerequisites

- Completed local Docker flow in [step 03](03-docker-compose-app-postgres.md).
- Docker Desktop and Docker daemon running.
- AWS CLI logged into the correct account and region per [step 00](00-prerequisites.md).
- No need to keep RDS running to build and push the image.
- If the ECR repository already exists from a previous demo, you can reuse it or delete and recreate.

## Knowledge to understand

- ECR repository stores Docker images.
- The image already contains app health, flow demo, `/test-error`, and PostgreSQL endpoints.
- ECS task definition should use a specific image tag, e.g., commit SHA or version.
- `latest` is convenient for labs but not good for production rollback.
- ECR storage is charged by image size.

## Estimated cost

- ECR repository does not run compute.
- Cost primarily comes from image storage and data transfer if applicable.
- With a few small images for the lab, costs are usually low, but still delete the repo after learning.

## Cost warning for paid services

ECR can incur storage costs if you keep many images. Create a lifecycle policy or delete the repo after the lab.

## Console steps

1. Go to ECR Console.
2. Select region `ap-southeast-1` or the region used for the lab.
3. In the **Private registry** menu, select **Repositories**.
4. Select **Create repository**.
5. Under **General settings**, enter Repository name: `learn-devops-demo-node`.
6. Under **Image tag settings**, select **Mutable** for simplicity in the lab. Leave **Mutable tag exclusions** empty.

- `Mutable`: allows pushing the same tag again.
- Production should consider **Immutable** to avoid overwriting a deployed image.

7. Under **Encryption settings**, select **AES-256**. The lab does not need **AWS KMS** because KMS may incur additional charges.
8. Under **Image scanning settings - deprecated**, you can keep defaults. New scan configuration should be done at the registry level.
9. Select **Create**.

If you want to enable scan on push:

1. In the **Private registry** menu, select **Scanning**.
2. Select **Basic scanning**.
3. Add a **Scan on push filter** for the repository `learn-devops-demo-node` or apply to all repositories.

## CLI check/debug commands

Create repo via CLI if not created via Console:

```bash
aws ecr create-repository \
  --repository-name learn-devops-demo-node
```

Login to ECR:

```bash
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/learn-devops-demo-node"

aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
```

Build and push:

```bash
cd server
docker build -t learn-devops-demo-node:local .
docker tag learn-devops-demo-node:local "$ECR_URI:demo-001"
docker push "$ECR_URI:demo-001"
```

Check image:

```bash
aws ecr describe-images \
  --repository-name learn-devops-demo-node \
  --query 'imageDetails[].{Tags:imageTags,Pushed:imagePushedAt,Size:imageSizeInBytes}' \
  --output table
```

## Expected result

- ECR repo `learn-devops-demo-node` exists.
- Image tag `demo-001` appears in ECR.
- You have the full image URI to use in the ECS task definition.
- No need to modify source or rebuild the image just to switch from local PostgreSQL to RDS.

## Cleanup

- If continuing: keep ECR repository and image tag `demo-001`. Step 07 needs this image to run the ECS task.
- If stopping here: delete the repository and all images to stop image storage.

```bash
aws ecr delete-repository \
  --repository-name learn-devops-demo-node \
  --force
```

## Troubleshooting

- Docker login fails: check region and account ID.
- Push denied: IAM user/role lacks ECR permissions.
- ECS pull image error later: check ECS execution role has `AmazonECSTaskExecutionRolePolicy`.