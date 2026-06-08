# 11 - ElastiCache Redis

## Mục tiêu

Tạo Redis cache private bằng Amazon ElastiCache để hiểu cache layer trong backend production. Roadmap chọn ElastiCache thay vì EFS vì app demo đã có endpoint `/api/demo-order` mô phỏng Redis/cache, nên học cache sẽ khớp hơn với flow hiện tại.

## Prerequisites

- Đã hoàn thành [step 04](04-vpc-network.md): VPC, private subnets và security groups còn tồn tại.
- Đã hoàn thành [step 07](07-ecs-fargate-service.md): ECS service còn chạy trong private subnet.
- Nên hoàn thành [step 09](09-secrets-and-env.md) để quen với env vars/runtime config.
- Nếu đã cleanup network hoặc ECS service: chạy lại step tương ứng trước.

## Kiến thức cần hiểu

- ElastiCache Redis nên nằm trong private subnet, không public internet.
- App ECS cần security group rule để connect Redis port `6379`.
- Redis thường dùng cho cache/session/rate limit, không thay thế database chính.
- Lab này tập trung hiểu network, endpoint và config; app hiện tại mô phỏng Redis status bằng env var.

## Chi phí ước lượng

ElastiCache vẫn là service tốn tiền. Với Console mới, lab này ưu tiên Redis OSS Serverless vì dễ tạo, không cần chọn node type và phù hợp để học network/cache endpoint nhanh. Xóa cache ngay sau khi học xong nếu không dùng tiếp.

## Cảnh báo service tốn tiền

Đừng để Redis cache chạy qua đêm nếu chỉ học thử. ElastiCache không miễn phí giống local Docker Redis.

## Các bước làm bằng Console

### 1. Tạo Security Group cho Redis trước

1. Vào EC2 > Security Groups > Create security group.
2. Security group name: `learn-devops-demo-redis-sg`.
3. Description: `Allow ECS to access Redis`.
4. VPC: chọn `learn-devops-demo-vpc`.
5. Inbound rules:
   - Type: Custom TCP.
   - Port range: `6379`.
   - Source: chọn security group của ECS service, ví dụ `learn-devops-demo-ecs-sg`.
6. Outbound rules: giữ mặc định.
7. Create security group.

Redis không cần public inbound. Chỉ ECS security group được phép gọi vào Redis port `6379`.

### 2. Tạo Redis OSS cache theo màn hình Console mới

1. Vào ElastiCache > Caches > Create cache.
2. Nếu popup giới thiệu Valkey hiện ra, bấm **Continue with Redis OSS**.
3. Ở màn hình **Create Redis OSS cache**, chọn như sau:
   - Engine: **Redis OSS**.
   - Deployment option: **Serverless**.
   - Creation method: **New cache**.
4. Settings:
   - Name: `learn-devops-demo-redis`.
   - Description: có thể để trống.
5. Default settings:
   - Chọn **Customize default settings** để tự kiểm tra VPC, subnet và security group.
6. Connectivity:
   - Network type: **IPv4**.
   - VPC ID: chọn VPC `learn-devops-demo-vpc`.
   - Availability Zones/Subnets: chỉ chọn private subnets của demo:
     - `learn-devops-demo-vpc-subnet-private1-ap-southeast-1a`
     - `learn-devops-demo-vpc-subnet-private2-ap-southeast-1b`
   - Không chọn các subnet có chữ `public`.
7. Security:
   - Chọn **Customize your security settings**.
   - Security groups: chọn `learn-devops-demo-redis-sg`.
   - Không dùng security group `default` cho lab này.
8. Backup:
   - Bỏ chọn **Enable automatic backups** cho lab ngắn hạn.
9. Usage limits:
   - Có thể để mặc định nếu chỉ học nhanh.
10. Tags:
    - Optional. Có thể thêm tag `Project=learn-devops`.
11. Bấm **Create**.
12. Chờ cache chuyển sang trạng thái **Available**.
13. Mở cache vừa tạo và copy endpoint. Ưu tiên endpoint chính trong phần **Endpoint**, không dùng reader endpoint nếu chỉ cần một host đơn giản.
14. Update ECS task/service env var nếu muốn ghi chú cache endpoint:
  Vào ECS > Task definitions -> Chọn family: learn-devops-demo-node -> Chọn revision mới nhất -> Create new revision

    - `REDIS_HOST=<redis-primary-endpoint>`
    - `DEMO_REDIS_STATUS=ok`

Nếu Console bắt chọn node type, bạn đang ở flow **Node-based cluster**. Quay lại phần Deployment option và chọn **Serverless** cho đúng với lab này.

## Lệnh CLI kiểm tra/debug

Liệt kê Redis OSS Serverless caches:

```bash
aws elasticache describe-serverless-caches \
  --query 'ServerlessCaches[?contains(ServerlessCacheName, `learn-devops-demo`)].{Name:ServerlessCacheName,Status:Status,Engine:Engine,Endpoint:Endpoint.Address,Port:Endpoint.Port}' \
  --output table
```

Kiểm tra Redis security group:

```bash
aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=learn-devops-demo-redis-sg" \
  --query 'SecurityGroups[].IpPermissions' \
  --output json
```

Test app flow qua ALB:

```bash
curl -i "http://$ALB_DNS/api/demo-order"
```

## Expected result

- Redis cache `learn-devops-demo-redis` ở trạng thái available.
- Redis chỉ nằm trong private network.
- Security group cho phép ECS connect Redis port `6379`.
- `/api/demo-order` vẫn trả về dependency flow có Redis/cache.

## Cleanup

- Nếu học tiếp Grafana/CloudFormation/Terraform ngay: có thể giữ Redis để quan sát resource.
- Nếu tạm dừng: xóa Redis cache để tránh phí.
- Nếu kết thúc toàn bộ demo: chuyển sang [step 15](15-cleanup-cost-control.md).

Xóa Redis OSS Serverless cache:

```bash
aws elasticache delete-serverless-cache \
  --serverless-cache-name learn-devops-demo-redis
```

## Troubleshooting

- ECS không connect được Redis: kiểm tra Redis SG inbound port `6379` từ ECS SG.
- Không thấy endpoint: chờ status chuyển sang available.
- App/client Redis thật bị lỗi TLS: Serverless Redis OSS có thể yêu cầu TLS, hãy dùng `rediss://` hoặc bật TLS trong Redis client.
- Không xóa được security group: xóa cache trước, chờ delete hoàn tất, rồi xóa security group.
