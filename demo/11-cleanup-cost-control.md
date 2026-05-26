# 11 - Cleanup And Cost Control

## Mục tiêu

Xóa toàn bộ resource demo để ngừng phát sinh chi phí, sau đó kiểm tra Billing.

## Kiến thức cần hiểu

- Một số resource phụ thuộc nhau nên phải xóa theo thứ tự.
- RDS, ALB, NAT Gateway, Fargate là các nguồn chi phí chính trong lab này.
- ECR, CloudWatch Logs, snapshots, Elastic IP cũng có thể còn chi phí nếu quên.

## Chi phí ước lượng

Bước cleanup giúp giảm chi phí. Sau cleanup, vẫn kiểm tra Billing vì cost explorer có thể delay vài giờ đến hơn một ngày.

## Cảnh báo service tốn tiền

Ưu tiên kiểm tra và xóa:

- NAT Gateway.
- RDS instance và snapshot không cần giữ.
- ALB.
- ECS services đang desired count > 0.
- ECR images.
- CloudWatch log groups.
- Elastic IP unattached.

## Các bước làm bằng Console

1. ECS: set desired count về 0, delete service, delete cluster nếu không dùng.
2. EC2 Load Balancers: delete ALB.
3. Target Groups: delete target group.
4. RDS: delete DB instance, bỏ final snapshot nếu không cần giữ data.
5. ECR: delete repository.
6. CloudWatch: delete log group và alarm demo.
7. VPC:
   - Delete NAT Gateway nếu có.
   - Release Elastic IP nếu có.
   - Delete security groups.
   - Delete subnets.
   - Detach/delete Internet Gateway.
   - Delete VPC.
8. Billing: kiểm tra Free Tier, Bills, Cost Explorer.

## Lệnh CLI kiểm tra/debug

Tìm ECS services:

```bash
aws ecs list-clusters
aws ecs list-services --cluster learn-devops-demo-cluster
```

Tìm ALB:

```bash
aws elbv2 describe-load-balancers \
  --query 'LoadBalancers[?contains(LoadBalancerName, `learn-devops-demo`)].{Name:LoadBalancerName,DNS:DNSName}' \
  --output table
```

Tìm RDS:

```bash
aws rds describe-db-instances \
  --query 'DBInstances[?contains(DBInstanceIdentifier, `learn-devops-demo`)].{Id:DBInstanceIdentifier,Status:DBInstanceStatus}' \
  --output table
```

Tìm ECR:

```bash
aws ecr describe-repositories \
  --query 'repositories[?contains(repositoryName, `learn-devops-demo`)].repositoryName' \
  --output table
```

Tìm NAT Gateway:

```bash
aws ec2 describe-nat-gateways \
  --filter "Name=tag:Name,Values=learn-devops-demo*" \
  --query 'NatGateways[].{Id:NatGatewayId,State:State}' \
  --output table
```

Tìm Elastic IP không attach:

```bash
aws ec2 describe-addresses \
  --query 'Addresses[?AssociationId==null].{PublicIp:PublicIp,AllocationId:AllocationId}' \
  --output table
```

Tìm log groups:

```bash
aws logs describe-log-groups \
  --log-group-name-prefix /ecs/learn-devops-demo \
  --query 'logGroups[].logGroupName' \
  --output table
```

## Expected result

- Không còn ECS service chạy.
- Không còn ALB demo.
- Không còn RDS demo nếu không muốn giữ DB.
- Không còn NAT Gateway demo.
- Billing không tiếp tục tăng bất thường trong các ngày sau.

## Cleanup

Đây là bước cleanup chính. Sau khi làm xong, giữ lại file note hoặc screenshot nếu muốn ghi log học tập.

## Troubleshooting

- VPC không xóa được: còn ENI từ ALB/ECS/RDS hoặc NAT Gateway chưa xóa xong.
- Security Group không xóa được: còn resource attach hoặc SG khác reference nó.
- RDS delete lâu: chờ status chuyển `deleting`, có thể mất nhiều phút.
- Cost vẫn hiện: Billing thường delay, kiểm tra lại sau vài giờ hoặc ngày tiếp theo.
