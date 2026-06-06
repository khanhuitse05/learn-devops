# 07 - ECS Fargate Service

## Mục tiêu

Deploy image server hoàn chỉnh lên ECS/Fargate. Ban đầu chạy app health độc lập với DB, sau đó gắn ALB và inject RDS secret ở các step tiếp theo.

## Prerequisites

- Đã hoàn thành [step 04](04-vpc-network.md): VPC, subnet và `learn-devops-demo-ecs-sg` vẫn tồn tại.
- Đã hoàn thành [step 06](06-ecr-image-registry.md): ECR repository còn image tag `demo-001`.
- Có ECS task execution role cho phép pull image từ ECR và ghi CloudWatch Logs.
- Nếu đã cleanup network: chạy lại [step 04](04-vpc-network.md).
- Nếu đã cleanup ECR repository: chạy lại [step 06](06-ecr-image-registry.md).

## Kiến thức cần hiểu

- ECS cluster là nơi quản lý task/service.
- Task definition mô tả container, CPU, memory, env, log config.
- Fargate tính phí theo vCPU, memory và thời gian task chạy.
- Execution role dùng để pull image và ghi log; task role dùng cho app gọi AWS service.
- Image đã hỗ trợ PostgreSQL. Không thêm code server trong bước ECS.

## Chi phí ước lượng

- Fargate task tính phí khi chạy.
- Chọn CPU/memory nhỏ nhất cho lab, ví dụ `0.25 vCPU` và `0.5 GB`.
- Desired count nên để `1`.

## Cảnh báo service tốn tiền

ECS service sẽ tự giữ task chạy liên tục theo desired count. Sau lab hãy set desired count về 0 hoặc delete service.

## Các bước làm bằng Console

1. Vào ECS Console.
2. Create cluster: `learn-devops-demo-cluster`.
3. Infrastructure: AWS Fargate.
4. Create task definition:
   - Family: `learn-devops-demo-node`.
   - Launch type: Fargate.
   - CPU/memory nhỏ nhất phù hợp.
   - Container name: `app`.
   - Image URI: ECR image từ step 06.
   - Port mapping: container port `3000`.
   - Environment:
     - `PORT=3000`
     - `HOST=0.0.0.0`
   - Log group: `/ecs/learn-devops-demo-node`.
5. Create service:
   - Service name: `learn-devops-demo-node-service`.
   - Desired tasks: `1`.
   - Subnets: private subnets nếu đã có ALB/NAT phù hợp; để tiết kiệm và đơn giản có thể dùng public subnet với assign public IP cho lab ngắn.
   - Security Group: `learn-devops-demo-ecs-sg`.

Chưa inject `DATABASE_URL` plain text trong bước này. `/health` vẫn hoạt động; các endpoint DB sẽ kết nối RDS sau khi cấu hình secret ở step 09.

## Lệnh CLI kiểm tra/debug

Kiểm tra cluster:

```bash
aws ecs describe-clusters \
  --clusters learn-devops-demo-cluster \
  --query 'clusters[].{Name:clusterName,Status:status,Running:runningTasksCount}' \
  --output table
```

Xem service:

```bash
aws ecs describe-services \
  --cluster learn-devops-demo-cluster \
  --services learn-devops-demo-node-service \
  --query 'services[].{Name:serviceName,Status:status,Desired:desiredCount,Running:runningCount,Pending:pendingCount}' \
  --output table
```

Xem stopped reason nếu task fail:

```bash
aws ecs list-tasks \
  --cluster learn-devops-demo-cluster \
  --desired-status STOPPED \
  --query 'taskArns[]' \
  --output text
```

```bash
aws logs tail /ecs/learn-devops-demo-node --since 30m
```

## Expected result

- ECS cluster active.
- Service desired count 1, running count 1.
- CloudWatch Logs có dòng `server started`.
- Không cần sửa hoặc rebuild server image.

## Cleanup

- Nếu học tiếp ngay step 08: giữ ECS service với desired count `1`. Step 08 cần task đang chạy để attach vào target group của ALB.
- Nếu tạm dừng nhưng sẽ học tiếp: scale desired count về `0` để ngừng phí Fargate. Trước khi học tiếp step 08, scale lại về `1`.
- Nếu dừng lab: xóa ECS service. Step 15 sẽ cleanup các resource còn lại.

Scale về `0` khi tạm dừng:

```bash
aws ecs update-service \
  --cluster learn-devops-demo-cluster \
  --service learn-devops-demo-node-service \
  --desired-count 0
```

Xóa service khi dừng lab:

```bash
aws ecs delete-service \
  --cluster learn-devops-demo-cluster \
  --service learn-devops-demo-node-service \
  --force
```

## Troubleshooting

- Task dừng ngay: xem ECS stopped reason và CloudWatch logs.
- Pull image fail: kiểm tra ECR URI và execution role.
- Không có logs: kiểm tra task execution role và log group.
- App không listen: image phải dùng `HOST=0.0.0.0` và `PORT=3000`.
- `/api/db/health` trả HTTP 503 trước step 09: đây là expected result vì task chưa nhận `DATABASE_URL`.
