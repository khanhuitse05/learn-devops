# 06 - ECR Image Registry

## Mục tiêu

Build Docker image hoàn chỉnh từ `./server` và push lên Amazon ECR để ECS có thể pull image. Các bước sau chỉ cấu hình hạ tầng và secret, không thêm code vào image.

## Kiến thức cần hiểu

- ECR repository lưu Docker image.
- Image đã chứa app health, flow demo và PostgreSQL endpoints.
- ECS task definition nên dùng image tag cụ thể, ví dụ commit SHA hoặc version.
- `latest` tiện cho lab nhưng không tốt cho rollback production.
- ECR storage tính phí theo dung lượng image.

## Chi phí ước lượng

- ECR repository không chạy compute.
- Chi phí chủ yếu là storage image và data transfer nếu có.
- Với vài image nhỏ cho lab, chi phí thường thấp, nhưng vẫn nên xóa repo sau khi học.

## Cảnh báo service tốn tiền

ECR có thể phát sinh phí storage nếu giữ nhiều image. Tạo lifecycle policy hoặc xóa repo sau lab.

## Các bước làm bằng Console

1. Vào ECR Console.
2. Create repository.
3. Repository name: `learn-devops-demo-node`.
4. Visibility: Private.
5. Image scan: bật nếu muốn học security scan.
6. Tag immutability: optional cho lab; production nên cân nhắc bật.

## Lệnh CLI kiểm tra/debug

Tạo repo bằng CLI nếu chưa tạo Console:

```bash
aws ecr create-repository \
  --repository-name learn-devops-demo-node \
  --image-scanning-configuration scanOnPush=true
```

Login ECR:

```bash
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/learn-devops-demo-node"

aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
```

Build và push:

```bash
cd server
docker build -t learn-devops-demo-node:local .
docker tag learn-devops-demo-node:local "$ECR_URI:demo-001"
docker push "$ECR_URI:demo-001"
```

Kiểm tra image:

```bash
aws ecr describe-images \
  --repository-name learn-devops-demo-node \
  --query 'imageDetails[].{Tags:imageTags,Pushed:imagePushedAt,Size:imageSizeInBytes}' \
  --output table
```

## Expected result

- ECR repo `learn-devops-demo-node` tồn tại.
- Image tag `demo-001` xuất hiện trong ECR.
- Bạn có full image URI để dùng trong ECS task definition.
- Không cần sửa source hoặc build lại image chỉ để chuyển từ PostgreSQL local sang RDS.

## Cleanup

- Nếu học tiếp: giữ ECR repository và image tag `demo-001`. Step 07 cần image này để chạy ECS task.
- Nếu dừng tại đây: xóa repository và toàn bộ image để ngừng lưu trữ image.

```bash
aws ecr delete-repository \
  --repository-name learn-devops-demo-node \
  --force
```

## Troubleshooting

- Docker login fail: kiểm tra region và account ID.
- Push denied: IAM user/role thiếu quyền ECR.
- ECS pull image fail sau này: kiểm tra ECS execution role có quyền `AmazonECSTaskExecutionRolePolicy`.
