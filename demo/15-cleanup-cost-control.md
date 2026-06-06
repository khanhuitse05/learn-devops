# 15 - Cleanup And Cost Control

## Mục tiêu

Xóa toàn bộ resource demo để ngừng phát sinh chi phí, sau đó kiểm tra Billing.

## Prerequisites

- Chỉ chạy step này khi muốn kết thúc demo hoặc dừng học đủ lâu để cần ngừng chi phí.
- AWS CLI đăng nhập đúng account và region đã dùng cho lab.
- Không cần tạo lại resource đã cleanup ở các step trước. Resource nào còn tồn tại thì xóa theo checklist bên dưới.
- Xác nhận không có resource production hoặc resource ngoài lab dùng prefix `learn-devops-demo`.

## Kiến thức cần hiểu

- Một số resource phụ thuộc nhau nên phải xóa theo thứ tự.
- RDS, ALB, NAT Gateway, Fargate, ElastiCache và Amazon Managed Grafana là các nguồn chi phí chính trong lab này.
- ECR, ElastiCache, Amazon Managed Grafana, CloudWatch Logs, snapshots, Elastic IP cũng có thể còn chi phí nếu quên.

## Chi phí ước lượng

Bước cleanup giúp giảm chi phí. Sau cleanup, vẫn kiểm tra Billing vì cost explorer có thể delay vài giờ đến hơn một ngày.

## Cảnh báo service tốn tiền

Ưu tiên kiểm tra và xóa:

- NAT Gateway.
- RDS instance và snapshot không cần giữ.
- ALB.
- ECS services đang desired count > 0.
- ECR images.
- ElastiCache Redis cluster/subnet group.
- Amazon Managed Grafana workspace.
- CloudWatch log groups.
- Elastic IP unattached.

## Các bước làm bằng Console

Đây là checklist cleanup tổng hợp cho các resource đã tạo từ step 00 đến step 14. Xóa theo thứ tự:

1. ECS: set desired count về `0`, delete service, deregister task definition revision nếu không dùng và delete cluster.
2. EC2 Load Balancers: delete ALB.
3. Target Groups: delete target group.
4. RDS: delete DB instance, bỏ final snapshot nếu không cần giữ data. Chờ DB bị xóa hoàn toàn trước khi cleanup VPC.
5. RDS: delete DB subnet group nếu đã tạo riêng cho lab.
6. ECR: delete repository và image.
7. ElastiCache: delete Redis cluster/cache, subnet group và security group rule liên quan.
8. Amazon Managed Grafana: delete workspace demo.
9. CloudFormation: delete stack demo nếu còn.
10. Terraform: chạy `terraform destroy` trong workspace lab nếu đã apply.
11. Systems Manager Parameter Store: delete `/learn-devops-demo/db-url` nếu đã tạo.
12. Secrets Manager: delete `learn-devops-demo/db-url` nếu đã tạo.
13. CloudWatch: delete dashboard, log group và alarm demo.
14. IAM: gỡ policy demo khỏi ECS execution role; xóa role nếu role được tạo riêng cho lab và không còn resource nào dùng.
15. VPC:
   - Delete NAT Gateway nếu có.
   - Release Elastic IP nếu có.
   - Delete security groups.
   - Delete subnets.
   - Detach/delete Internet Gateway.
   - Delete VPC.
16. Local Docker: chạy `docker compose down -v` trong `./server` nếu không cần giữ PostgreSQL local.
17. Billing: kiểm tra Free Tier, Bills, Cost Explorer.

Budget alarm từ step 00 có thể giữ lại để tiếp tục bảo vệ account.

## Lệnh CLI kiểm tra/debug

Đảm bảo `AWS_REGION` giống region đã dùng trong các step trước. Ví dụ, Singapore là `ap-southeast-1`:

```bash
AWS_REGION=ap-southeast-1
export AWS_DEFAULT_REGION="$AWS_REGION"
```

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

Tìm target group:

```bash
aws elbv2 describe-target-groups \
  --query 'TargetGroups[?contains(TargetGroupName, `learn-devops-demo`)].TargetGroupName' \
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

Tìm ElastiCache Redis:

```bash
aws elasticache describe-cache-clusters \
  --query 'CacheClusters[?contains(CacheClusterId, `learn-devops-demo`)].{Id:CacheClusterId,Status:CacheClusterStatus,Engine:Engine}' \
  --output table
```

Tìm Amazon Managed Grafana workspace:

```bash
aws grafana list-workspaces \
  --query 'workspaces[?contains(name, `learn-devops-demo`)].{Id:id,Name:name,Status:status}' \
  --output table
```

Tìm CloudFormation stack:

```bash
aws cloudformation list-stacks \
  --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE ROLLBACK_COMPLETE \
  --query 'StackSummaries[?contains(StackName, `learn-devops-demo`)].{Name:StackName,Status:StackStatus}' \
  --output table
```

Tìm SSM parameter:

```bash
aws ssm describe-parameters \
  --parameter-filters "Key=Name,Option=BeginsWith,Values=/learn-devops-demo/" \
  --query 'Parameters[].Name' \
  --output table
```

Tìm Secrets Manager secret:

```bash
aws secretsmanager list-secrets \
  --query 'SecretList[?contains(Name, `learn-devops-demo`)].Name' \
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

Tìm CloudWatch alarm:

```bash
aws cloudwatch describe-alarms \
  --alarm-name-prefix learn-devops-demo \
  --query 'MetricAlarms[].AlarmName' \
  --output table
```

Tìm CloudWatch dashboard:

```bash
aws cloudwatch list-dashboards \
  --dashboard-name-prefix learn-devops-demo \
  --query 'DashboardEntries[].DashboardName' \
  --output table
```

## Expected result

- Không còn ECS service chạy.
- Không còn ALB demo.
- Không còn RDS demo nếu không muốn giữ DB.
- Không còn ECR repository và image demo.
- Không còn ElastiCache Redis demo.
- Không còn Amazon Managed Grafana workspace demo.
- Không còn CloudFormation stack demo.
- Không còn Terraform-managed resource demo.
- Không còn SSM parameter hoặc Secrets Manager secret demo.
- Không còn CloudWatch dashboard, log group và alarm demo.
- Không còn NAT Gateway demo.
- Không còn Elastic IP không sử dụng.
- Không còn VPC demo sau khi đã xóa hết dependency.
- Billing không tiếp tục tăng bất thường trong các ngày sau.

## Cleanup

Đây là bước cleanup chính. Sau khi làm xong, giữ lại file note hoặc screenshot nếu muốn ghi log học tập.

## Troubleshooting

- VPC không xóa được: còn ENI từ ALB/ECS/RDS hoặc NAT Gateway chưa xóa xong.
- Security Group không xóa được: còn resource attach hoặc SG khác reference nó.
- RDS delete lâu: chờ status chuyển `deleting`, có thể mất nhiều phút.
- Cost vẫn hiện: Billing thường delay, kiểm tra lại sau vài giờ hoặc ngày tiếp theo.
