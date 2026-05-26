# AWS Demo Roadmap

Roadmap này dùng repo `learn-devops` để thực hành AWS theo hướng Console + CLI. Mục tiêu là đi từ app Node.js local trong `./server` đến một backend chạy trên ECS/Fargate, có image trên ECR, public qua ALB, kết nối PostgreSQL/RDS, có secrets, logs, alarm và cleanup rõ ràng.

Ưu tiên của toàn bộ demo:

- Tiết kiệm chi phí tối đa.
- Dùng region mặc định `ap-southeast-1`, có thể đổi bằng `AWS_REGION`.
- Đặt tên resource bằng prefix `learn-devops-demo-*`.
- Không public database ra internet.
- Mọi service có khả năng tốn tiền đều phải có bước cleanup.

## Quick Setup

```bash
export AWS_REGION=ap-southeast-1
export AWS_DEFAULT_REGION="$AWS_REGION"
export DEMO_PREFIX=learn-devops-demo
aws sts get-caller-identity
```

## Roadmap Modules

| Step | File | AWS service | Mục tiêu | Output cần đạt | Chi phí ước lượng | Cảnh báo |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | [00-prerequisites.md](00-prerequisites.md) | IAM, Billing, AWS CLI | Chuẩn bị account an toàn | MFA, budget, CLI profile OK | Thường miễn phí | Bắt buộc bật cảnh báo chi phí |
| 1 | [01-local-server-baseline.md](01-local-server-baseline.md) | Local only | Hiểu app hiện có | `/health`, `/flow`, `/api/demo-order` chạy được | Miễn phí | Không dùng AWS |
| 2 | [02-postgresql-local.md](02-postgresql-local.md) | Local PostgreSQL | Chuẩn bị app cho RDS | Schema orders, DB health, query test | Miễn phí nếu chạy local | Chưa tạo RDS |
| 3 | [03-docker-compose-app-postgres.md](03-docker-compose-app-postgres.md) | Local Docker | Chạy app + Postgres giống môi trường deploy | Compose up, app kết nối DB | Miễn phí local | Xóa volume nếu muốn reset DB |
| 4 | [04-vpc-network.md](04-vpc-network.md) | VPC, Subnet, SG | Tạo network tối giản | VPC, public/private subnet, SG | VPC/SG miễn phí; NAT tốn phí | Tránh NAT Gateway nếu chưa cần |
| 5 | [05-rds-postgresql.md](05-rds-postgresql.md) | RDS PostgreSQL | Demo database managed | RDS private, app/test host kết nối được | Có thể free tier, ngoài free tier sẽ tốn tiền | Không public RDS |
| 6 | [06-ecr-image-registry.md](06-ecr-image-registry.md) | ECR | Push Docker image | Image có tag trong ECR | Storage nhỏ thường thấp | Xóa repo/images sau lab |
| 7 | [07-ecs-fargate-service.md](07-ecs-fargate-service.md) | ECS/Fargate | Chạy container app | ECS task/service healthy | Fargate tính phí theo vCPU/RAM/giờ | Stop/delete service sau lab |
| 8 | [08-alb-public-entry.md](08-alb-public-entry.md) | ALB | Public HTTP entry vào ECS | ALB DNS gọi được `/health` | ALB tính phí theo giờ + LCU | Delete ALB sau lab |
| 9 | [09-secrets-and-env.md](09-secrets-and-env.md) | Secrets Manager, SSM | Quản lý DB config | Task lấy secret/env an toàn | Secrets Manager tính phí theo secret/tháng | Có thể dùng SSM để tiết kiệm |
| 10 | [10-observability.md](10-observability.md) | CloudWatch | Logs, metrics, alarm | Log group, alarm cơ bản | Logs/alarms có phí nhỏ | Xóa alarm/log group |
| 11 | [11-cleanup-cost-control.md](11-cleanup-cost-control.md) | Billing, all services | Xóa resource và kiểm tra bill | Không còn resource demo chạy | Giúp ngừng phát sinh phí | Làm ngay sau khi học xong |

## Recommended Flow

1. Làm step 0-3 hoàn toàn local để hiểu app và database.
2. Làm step 4-5 để hiểu private network và RDS.
3. Làm step 6-8 để deploy container lên ECS và expose qua ALB.
4. Làm step 9-10 để vận hành đúng hơn: secrets, logs, alarm.
5. Làm step 11 ngay sau buổi thực hành để dừng chi phí.

## Server Roadmap

App hiện tại trong `./server` là Node.js thuần, chưa có dependency ngoài. Các endpoint đang có:

- `/health`: health check đơn giản.
- `/flow`: mô phỏng request path mobile/browser -> DNS -> ALB/API Gateway -> ECS.
- `/api/demo-order`: mô phỏng app gọi RDS/Redis/EFS bằng env var.
- `/crash`: tạo lỗi để học systemd/log restart.

Khi chuyển sang demo RDS thật, bổ sung code theo hướng:

- Thêm dependency `pg`.
- Hỗ trợ `DATABASE_URL`, hoặc `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`.
- Thêm endpoint `/api/db/health` để kiểm tra DB.
- Thêm endpoint `/api/orders` và `/api/orders/:id` để đọc/ghi bảng `orders`.
- Giữ `/health` không phụ thuộc DB để ALB/ECS health check không fail khi DB đang lỗi.

## Acceptance Checklist

- Mỗi file step có mục tiêu, kiến thức, chi phí, warning, Console steps, CLI checks, expected result, cleanup và troubleshooting.
- Các lab AWS đều có cảnh báo chi phí trước khi tạo resource.
- Các lệnh dùng prefix `learn-devops-demo-*` để dễ cleanup.
- RDS không mở public access.
- Người học có thể đi theo thứ tự: local app -> PostgreSQL local -> Docker -> VPC/RDS -> ECR -> ECS -> ALB -> secrets/logs -> cleanup.
