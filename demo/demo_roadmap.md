# AWS Demo Roadmap

Roadmap này dùng repo `learn-devops` để thực hành AWS theo hướng Console + CLI. Mục tiêu là đi từ app Node.js local trong `./server` đến một backend chạy trên ECS/Fargate, có image trên ECR, public qua ALB, kết nối PostgreSQL/RDS, thêm cache Redis bằng ElastiCache, có secrets, CloudWatch, Grafana, Infrastructure as Code và cleanup rõ ràng.

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

## Prerequisites Và Resume Sau Cleanup

- Bắt đầu từ step 00 nếu đây là lần đầu chạy demo.
- Mỗi file step có mục `Prerequisites`. Kiểm tra mục này trước khi thao tác.
- Nếu đã cleanup resource ở step trước, chạy lại step được link trong `Prerequisites`.
- Không cần tạo lại resource vẫn còn tồn tại. Kiểm tra region và tên resource trước để tránh tạo trùng.

## Roadmap Modules

| Step | File | AWS service | Mục tiêu | Output cần đạt | Chi phí ước lượng | Cảnh báo |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | [00-prerequisites.md](00-prerequisites.md) | IAM, Billing, AWS CLI | Chuẩn bị account an toàn | MFA, budget, CLI profile OK | Thường miễn phí | Bắt buộc bật cảnh báo chi phí |
| 1 | [01-local-server-baseline.md](01-local-server-baseline.md) | Local only | Smoke test server hoàn chỉnh | App health OK, DB health fail độc lập khi chưa có DB | Miễn phí | Không dùng AWS |
| 2 | [02-postgresql-local.md](02-postgresql-local.md) | Local PostgreSQL | Kết nối server có sẵn với DB local | Schema orders, DB health, query test | Miễn phí nếu chạy local | Chưa tạo RDS |
| 3 | [03-docker-compose-app-postgres.md](03-docker-compose-app-postgres.md) | Local Docker | Chạy stack Compose có sẵn | Compose up, auto-init schema, app kết nối DB | Miễn phí local | Xóa volume nếu muốn reset DB |
| 4 | [04-vpc-network.md](04-vpc-network.md) | VPC, Subnet, SG | Tạo network tối giản | VPC, public/private subnet, SG | VPC/SG miễn phí; NAT tốn phí | Tránh NAT Gateway nếu chưa cần |
| 5 | [05-rds-postgresql.md](05-rds-postgresql.md) | RDS PostgreSQL | Demo database managed | RDS private, test host kết nối được, schema sẵn sàng | Có thể free tier, ngoài free tier sẽ tốn tiền | Không public RDS |
| 6 | [06-ecr-image-registry.md](06-ecr-image-registry.md) | ECR | Push Docker image | Image có tag trong ECR | Storage nhỏ thường thấp | Xóa repo/images sau lab |
| 7 | [07-ecs-fargate-service.md](07-ecs-fargate-service.md) | ECS/Fargate | Chạy container app | ECS task/service healthy | Fargate tính phí theo vCPU/RAM/giờ | Stop/delete service sau lab |
| 8 | [08-alb-public-entry.md](08-alb-public-entry.md) | ALB | Public HTTP entry vào ECS | ALB DNS gọi được `/health` | ALB tính phí theo giờ + LCU | Delete ALB sau lab |
| 9 | [09-secrets-and-env.md](09-secrets-and-env.md) | Secrets Manager, SSM | Quản lý DB config | Task lấy secret/env an toàn | Secrets Manager tính phí theo secret/tháng | Có thể dùng SSM để tiết kiệm |
| 10 | [10-observability.md](10-observability.md) | CloudWatch | Logs, metrics, alarm, dashboard | Log group, metric view, alarm cơ bản | Logs/alarms có phí nhỏ | Xóa alarm/log group |
| 11 | [11-elasticache-redis.md](11-elasticache-redis.md) | ElastiCache Redis | Thêm cache private cho app | Redis cluster private, ECS task có env cache | ElastiCache tính phí theo node/giờ | Chọn Redis thay EFS vì app đã mô phỏng cache |
| 12 | [12-amazon-managed-grafana.md](12-amazon-managed-grafana.md) | Amazon Managed Grafana | Dashboard từ CloudWatch metrics/logs | Workspace Grafana, CloudWatch data source | Grafana workspace/user có phí | Xóa workspace sau lab |
| 13 | [13-cloudformation.md](13-cloudformation.md) | AWS CloudFormation | Học IaC native của AWS | Template tạo resource nhỏ có tag demo | Stack resource có thể phát sinh phí | Delete stack khi xong |
| 14 | [14-terraform.md](14-terraform.md) | Terraform | Học IaC đa cloud/provider AWS | Terraform plan/apply/destroy cho resource nhỏ | Resource tạo bởi Terraform có phí | Luôn chạy destroy sau lab |
| 15 | [15-cleanup-cost-control.md](15-cleanup-cost-control.md) | Billing, all services | Xóa resource và kiểm tra bill | Không còn resource demo chạy | Giúp ngừng phát sinh phí | Làm ngay sau khi học xong |

## Recommended Flow

1. Làm step 0-3 hoàn toàn local để hiểu app và database.
2. Làm step 4-5 để hiểu private network và RDS.
3. Làm step 6-8 để deploy container lên ECS và expose qua ALB.
4. Làm step 9-12 để vận hành đúng hơn: secrets, CloudWatch, ElastiCache Redis và Grafana.
5. Làm step 13-14 để hiểu Infrastructure as Code bằng CloudFormation và Terraform.
6. Làm step 15 ngay sau buổi thực hành để dừng chi phí.

Mỗi step có mục `Cleanup`:

- Nếu học tiếp ngay: giữ các resource mà step sau còn cần.
- Nếu tạm dừng: ưu tiên scale về `0` hoặc xóa resource tính phí theo giờ như RDS, Fargate task và ALB.
- Khi kết thúc demo: làm step 15 để xóa toàn bộ resource theo đúng thứ tự dependency.

## Server hoàn chỉnh trước khi demo

`./server` đã là app hoàn chỉnh trước khi bắt đầu roadmap. Trong quá trình học chỉ thay đổi infrastructure, env vars và secret; không cần sửa source code server.

Artifact đã có:

- `app.js`: HTTP server, health check, flow demo và PostgreSQL endpoints.
- `schema.sql`: schema và seed data idempotent.
- `compose.yml`: app + PostgreSQL local, healthcheck và auto-init schema.
- `Dockerfile`: image dùng lại cho local Docker, ECR và ECS.
- `package.json` và `package-lock.json`: dependency `pg` đã được lock.

Endpoint đã có:

- `/health`: health check đơn giản.
- `/flow`: mô phỏng request path mobile/browser -> DNS -> ALB/API Gateway -> ECS.
- `/api/demo-order`: mô phỏng app gọi RDS/Redis/EFS bằng env var.
- `/api/db/health`: chạy `select 1` với PostgreSQL thật.
- `/api/orders` và `/api/orders/:id`: đọc/ghi bảng `orders`.
- `/crash`: tạo lỗi để học systemd/log restart.

Khi chuyển từ local PostgreSQL sang RDS, chỉ đổi `DATABASE_URL` hoặc các biến `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`. `/health` luôn không phụ thuộc DB để ALB/ECS health check không fail khi DB đang lỗi.

## Acceptance Checklist

- Mỗi file step có mục tiêu, kiến thức, chi phí, warning, Console steps, CLI checks, expected result, cleanup và troubleshooting.
- Các lab AWS đều có cảnh báo chi phí trước khi tạo resource.
- Các lệnh dùng prefix `learn-devops-demo-*` để dễ cleanup.
- RDS không mở public access.
- Không có bước nào yêu cầu sửa source code server trong lúc thực hành.
- Người học có thể đi theo thứ tự: local app -> PostgreSQL local -> Docker -> VPC/RDS -> ECR -> ECS -> ALB -> secrets -> CloudWatch -> ElastiCache Redis -> Grafana -> CloudFormation -> Terraform -> cleanup.
