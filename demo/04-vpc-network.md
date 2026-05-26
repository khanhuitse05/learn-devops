# 04 - VPC Network

## Mục tiêu

Tạo network tối giản để chuẩn bị cho RDS, ECS và ALB. Ưu tiên tiết kiệm chi phí, nên bước đầu không tạo NAT Gateway nếu chưa cần.

## Kiến thức cần hiểu

- ALB cần public subnet.
- ECS task và RDS nên chạy private subnet.
- Security Group là firewall chính ở cấp resource.
- RDS không cần public access nếu app chạy trong cùng VPC.

## Chi phí ước lượng

- VPC, subnet, route table, security group: miễn phí.
- Internet Gateway: miễn phí.
- NAT Gateway: tốn phí theo giờ và data. Không tạo NAT Gateway trong lab tối giản trừ khi thật sự cần outbound internet từ private subnet.

## Cảnh báo service tốn tiền

NAT Gateway là resource dễ quên và tốn phí. Với lab tiết kiệm, tránh tạo NAT Gateway hoặc xóa ngay sau khi test.

## Các bước làm bằng Console

1. Vào VPC Console.
2. Tạo VPC tên `learn-devops-demo-vpc`, CIDR `10.0.0.0/16`.
3. Tạo 2 public subnets:
   - `learn-devops-demo-public-a`: `10.0.1.0/24`
   - `learn-devops-demo-public-b`: `10.0.2.0/24`
4. Tạo 2 private subnets:
   - `learn-devops-demo-private-a`: `10.0.11.0/24`
   - `learn-devops-demo-private-b`: `10.0.12.0/24`
5. Tạo Internet Gateway và attach vào VPC.
6. Tạo public route table có route `0.0.0.0/0` tới Internet Gateway.
7. Associate public route table với 2 public subnets.
8. Giữ private route table chỉ có local route.
9. Tạo Security Groups:
   - `learn-devops-demo-alb-sg`: inbound HTTP 80 từ `0.0.0.0/0`.
   - `learn-devops-demo-ecs-sg`: inbound app port 3000 từ ALB SG.
   - `learn-devops-demo-rds-sg`: inbound PostgreSQL 5432 từ ECS SG.

## Lệnh CLI kiểm tra/debug

```bash
aws ec2 describe-vpcs \
  --filters "Name=tag:Name,Values=learn-devops-demo-vpc" \
  --query 'Vpcs[].{VpcId:VpcId,Cidr:CidrBlock}' \
  --output table
```

```bash
aws ec2 describe-subnets \
  --filters "Name=tag:Name,Values=learn-devops-demo-*" \
  --query 'Subnets[].{Name:Tags[?Key==`Name`]|[0].Value,SubnetId:SubnetId,Cidr:CidrBlock,Az:AvailabilityZone}' \
  --output table
```

```bash
aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=learn-devops-demo-*" \
  --query 'SecurityGroups[].{GroupName:GroupName,GroupId:GroupId,VpcId:VpcId}' \
  --output table
```

## Expected result

- Có VPC và 4 subnet theo đúng CIDR.
- Public subnet có route ra Internet Gateway.
- Private subnet không public trực tiếp ra internet.
- Security Group RDS chỉ nhận traffic từ ECS SG, không mở `0.0.0.0/0`.

## Cleanup

Chỉ cleanup network sau khi đã xóa RDS, ECS service, ALB và ENI liên quan.

Thứ tự:

1. Delete ALB/target group.
2. Delete ECS service/cluster.
3. Delete RDS.
4. Delete security groups.
5. Delete subnets.
6. Detach/delete Internet Gateway.
7. Delete VPC.

## Troubleshooting

- Không delete được VPC: còn ENI, RDS, ALB hoặc ECS resource trong VPC.
- ECS không connect RDS: kiểm tra inbound rule của RDS SG có source là ECS SG.
- ALB không tới ECS: kiểm tra ECS SG có inbound port 3000 từ ALB SG.
