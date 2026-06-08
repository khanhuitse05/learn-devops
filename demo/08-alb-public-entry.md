# 08 - ALB Public Entry

## Mục tiêu

Tạo Application Load Balancer public để truy cập app ECS qua HTTP và test `/health`, `/flow`, `/api/demo-order`.

## Prerequisites

- Đã hoàn thành [step 04](04-vpc-network.md): 2 public subnet và `learn-devops-demo-alb-sg` vẫn tồn tại.
- Đã hoàn thành [step 07](07-ecs-fargate-service.md): ECS service còn tồn tại và desired count là `1`.
- ECS task đang ở trạng thái `RUNNING` và app lắng nghe port `3000`.
- Nếu đã scale ECS service về `0`, scale lại về `1` trước.
- Nếu đã cleanup ALB từ lần chạy trước, tạo lại theo step này.

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

1. Vào AWS Console -> EC2 -> Load Balancers.
2. Chọn Create load balancer -> Application Load Balancer.
3. Ở phần Basic configuration:
   - Load balancer name: `learn-devops-demo-alb`.
   - Scheme: chọn Internet-facing.
   - Load balancer IP address type: chọn IPv4.
4. Ở phần Network mapping:
   - VPC: chọn `learn-devops-demo-vpc`.
   - IPAM pools: không tick Use IPAM pool for public IPv4 addresses.
   - Availability Zones and subnets: chọn 2 Availability Zones.
   - Với mỗi Availability Zone, chọn public subnet tương ứng đã tạo ở step 04.
5. Ở phần Security groups:
   - Xóa security group `default` nếu đang được chọn.
   - Chọn `learn-devops-demo-alb-sg`.
6. Ở phần Listeners and routing:
   - Listener protocol: HTTP.
   - Listener port: 80.
   - Default action: Forward to target groups.
7. Nếu chưa có target group, chọn create target group và tạo:
   - Ở phần Target type: chọn IP addresses.
   - Target group name: `learn-devops-demo-node-tg`.
   - Protocol: HTTP.
   - Port: 3000.
   - IP address type: IPv4.
   - VPC: chọn `learn-devops-demo-vpc`.
   - Protocol version: HTTP1.
   - Health check protocol: HTTP.
   - Health check path: `/health`.
   - Advanced health check settings: để mặc định.
   - Target optimizer: chọn Off - Default.
   - Attributes và Tags: để mặc định, không cần thêm.
   - Chọn Next.
   - Ở bước Register targets: chưa cần register thủ công target nào, vì ECS service sẽ tự register task vào target group sau khi attach.
   - Chọn Review and create -> Create target group.
8. Quay lại màn Create Application Load Balancer, ở Target group chọn `learn-devops-demo-node-tg`.
9. Các phần optional như Load balancer tags, CloudFront/WAF, AWS WAF và AWS Global Accelerator để mặc định, không tick thêm.
10. Kiểm tra phần Review:
    - Scheme: Internet-facing.
    - IP address type: IPv4.
    - VPC: `learn-devops-demo-vpc`.
    - Security groups: `learn-devops-demo-alb-sg`.
    - Listener: HTTP:80 forward tới `learn-devops-demo-node-tg`.
11. Chọn Create load balancer.
12. Update ECS service để attach target group:
    - Vào ECS Console -> Clusters -> chọn `learn-devops-demo-cluster`.
    - Mở tab Services -> chọn `learn-devops-demo-node-service`.
    - Chọn Update service.
    - Ở phần Load balancing, chọn Application Load Balancer.
    - Load balancer: chọn `learn-devops-demo-alb`.
    - Listener: chọn HTTP:80.
    - Target group: chọn `learn-devops-demo-node-tg`.
    - Container to load balance:
      - Container name: `app`.
      - Container port: `3000`.
    - Desired tasks: giữ `1`.
    - Giữ các mục còn lại mặc định, chọn Update.
    - ECS sẽ deploy lại service và tự register private IP của Fargate task vào target group.
13. Chờ target healthy.

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

- Nếu học tiếp ngay step 09 và 10: giữ ALB, target group và ECS service. Hai step sau dùng ALB để kiểm tra app.
- Nếu tạm dừng hoặc không học tiếp: xóa ALB vì ALB tính phí theo giờ ngay cả khi không có traffic. Có thể scale ECS service về `0` theo step 07.

Thứ tự xóa ALB:

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
