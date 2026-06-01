# 08 - ALB Public Entry

## Mục tiêu

Tạo Application Load Balancer public để truy cập app ECS qua HTTP và test `/health`, `/flow`, `/api/demo-order`.

## Kiến thức cần hiểu

- ALB nằm ở public subnets.
- Target group forward traffic tới ECS task port 3000.
- Health check path nên là `/health`.
- ALB Security Group nhận HTTP từ internet; ECS Security Group chỉ nhận từ ALB SG.

## Chi phí ước lượng

- ALB tính phí theo giờ và LCU.
- Target group không đáng kể so với ALB.
- Với lab ngắn, chi phí thấp hơn nhiều so với để ALB chạy nhiều ngày.

## Cảnh báo service tốn tiền

ALB tốn phí ngay cả khi không có traffic. Delete ALB sau khi demo xong.

## Các bước làm bằng Console

1. Vào EC2 Console -> Load Balancers.
2. Create Application Load Balancer.
3. Name: `learn-devops-demo-alb`.
4. Scheme: Internet-facing.
5. Listener: HTTP 80.
6. VPC: `learn-devops-demo-vpc`.
7. Subnets: 2 public subnets.
8. Security Group: `learn-devops-demo-alb-sg`.
9. Create target group:
   - Name: `learn-devops-demo-node-tg`.
   - Target type: IP.
   - Protocol: HTTP.
   - Port: 3000.
   - Health check path: `/health`.
10. Update ECS service để attach target group.
11. Chờ target healthy.

## Lệnh CLI kiểm tra/debug

Xem ALB DNS:

```bash
aws elbv2 describe-load-balancers \
  --names learn-devops-demo-alb \
  --query 'LoadBalancers[0].DNSName' \
  --output text
```

Lưu DNS:

```bash
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --names learn-devops-demo-alb \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

curl -i "http://$ALB_DNS/health"
curl -i "http://$ALB_DNS/flow"
curl -i "http://$ALB_DNS/api/demo-order"
```

Các endpoint PostgreSQL đã tồn tại trong image nhưng chưa cần pass ở bước này. Sau khi inject `DATABASE_URL` trong step 09, test thêm:

```bash
curl -i "http://$ALB_DNS/api/db/health"
curl -i "http://$ALB_DNS/api/orders"
```

Xem target health:

```bash
TARGET_GROUP_ARN=$(aws elbv2 describe-target-groups \
  --names learn-devops-demo-node-tg \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

aws elbv2 describe-target-health \
  --target-group-arn "$TARGET_GROUP_ARN" \
  --output table
```

## Expected result

- ALB DNS trả HTTP 200 cho `/health`.
- Target group health là `healthy`.
- `/flow` cho thấy entry layer có thể mô phỏng ALB.
- Không cần sửa code server khi attach ALB.

## Cleanup

1. Update ECS service để detach target group hoặc delete service.
2. Delete ALB.
3. Delete target group.

CLI:

```bash
aws elbv2 describe-load-balancers \
  --names learn-devops-demo-alb \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text
```

Dùng ARN trả về để delete nếu muốn cleanup bằng CLI:

```bash
aws elbv2 delete-load-balancer --load-balancer-arn YOUR_ALB_ARN
aws elbv2 delete-target-group --target-group-arn YOUR_TARGET_GROUP_ARN
```

## Troubleshooting

- Target unhealthy: kiểm tra `/health`, port 3000, ECS SG inbound từ ALB SG.
- ALB 502: app không listen đúng port hoặc task bị restart.
- ALB timeout: route/Security Group sai hoặc task không reachable.
