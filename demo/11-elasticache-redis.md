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

ElastiCache tính phí theo node/giờ. Chọn node nhỏ nhất phù hợp lab và xóa ngay sau khi học xong.

## Cảnh báo service tốn tiền

Đừng để Redis cluster chạy qua đêm nếu chỉ học thử. ElastiCache không miễn phí giống local Docker Redis.

## Các bước làm bằng Console

1. Vào ElastiCache.
2. Create Redis OSS cache.
3. Chọn design đơn giản, single node, không Multi-AZ cho lab.
4. Name: `learn-devops-demo-redis`.
5. Network type: IPv4.
6. VPC: `learn-devops-demo-vpc`.
7. Subnet group: tạo subnet group mới từ private subnets.
8. Security group: tạo hoặc chọn `learn-devops-demo-redis-sg`.
9. Inbound rule của Redis SG: allow TCP `6379` từ `learn-devops-demo-ecs-sg`.
10. Sau khi available, copy primary endpoint.
11. Update ECS task/service env var nếu muốn ghi chú cache endpoint:
    - `REDIS_HOST=<redis-primary-endpoint>`
    - `DEMO_REDIS_STATUS=ok`

## Lệnh CLI kiểm tra/debug

Liệt kê Redis clusters:

```bash
aws elasticache describe-cache-clusters \
  --show-cache-node-info \
  --query 'CacheClusters[?contains(CacheClusterId, `learn-devops-demo`)].{Id:CacheClusterId,Status:CacheClusterStatus,Endpoint:CacheNodes[0].Endpoint.Address}' \
  --output table
```

Kiểm tra ECS security group:

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
- Nếu tạm dừng: xóa Redis cluster để tránh phí.
- Nếu kết thúc toàn bộ demo: chuyển sang [step 15](15-cleanup-cost-control.md).

Xóa Redis cluster:

```bash
aws elasticache delete-cache-cluster \
  --cache-cluster-id learn-devops-demo-redis
```

## Troubleshooting

- ECS không connect được Redis: kiểm tra Redis SG inbound port `6379` từ ECS SG.
- Không thấy endpoint: chờ status chuyển sang available.
- Không xóa được subnet group: xóa cache cluster trước, chờ delete hoàn tất.
