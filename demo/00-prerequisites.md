# 00 - Prerequisites

## Mục tiêu

Chuẩn bị AWS account an toàn trước khi tạo bất kỳ resource nào. Sau bước này bạn có AWS CLI chạy được, biết region đang dùng, có budget alarm và naming convention để cleanup.

## Trainer Notes

- Giữ AWS region nhất quán trong toàn bộ demo, mặc định là `ap-southeast-1`.
- Dùng resource prefix `learn-devops-demo-*` để dễ cleanup.
- Không public expose database hoặc cache.
- Các lab sau có thể tạo resource tính phí: RDS, Fargate, ALB, ElastiCache, Grafana, CloudWatch và Secrets Manager.
- Sau mỗi buổi thực hành, kết thúc bằng [15 - Cleanup And Cost Control](15-cleanup-cost-control.md).

## Prerequisites

- Có AWS account và quyền truy cập AWS Console.
- Có email nhận cảnh báo chi phí.
- Máy local có terminal để cài và cấu hình AWS CLI.

## Kiến thức cần hiểu

- Root account chỉ dùng cho việc quản trị account, không dùng hằng ngày.
- IAM user/role nên dùng least privilege.
- Budget alarm giúp phát hiện chi phí sớm.
- Region quyết định nơi resource được tạo.

## Chi phí ước lượng

- IAM, MFA, AWS CLI: miễn phí.
- AWS Budgets: thường có free quota cho budget cơ bản; kiểm tra trang Billing nếu account của bạn có điều kiện khác.

## Cảnh báo service tốn tiền

Chưa tạo compute/database ở bước này. Tuy vậy hãy tạo budget trước các lab sau vì RDS, NAT Gateway, ALB và Fargate có thể tính phí theo giờ.

## Các bước làm bằng Console

1. Đăng nhập AWS Console.
2. Bật MFA cho root user.
3. Vào Billing and Cost Management.
4. Tạo budget tên `learn-devops-demo-budget`.
5. Đặt ngưỡng nhỏ cho lab, ví dụ 5-10 USD.
6. Thêm email nhận cảnh báo.
7. Chọn region mặc định cho lab: `ap-southeast-1`.

## Lệnh CLI kiểm tra/debug

```bash
aws configure
export AWS_REGION=ap-southeast-1
export AWS_DEFAULT_REGION="$AWS_REGION"
export DEMO_PREFIX=learn-devops-demo

aws sts get-caller-identity
aws configure list
```

Kiểm tra region:

```bash
aws ec2 describe-availability-zones \
  --region "$AWS_REGION" \
  --query 'AvailabilityZones[].ZoneName' \
  --output table
```

## Expected result

- `aws sts get-caller-identity` trả về `Account`, `Arn`, `UserId`.
- Console có budget alarm.
- Bạn biết chính xác region đang dùng.

## Cleanup

- Nếu học tiếp: giữ budget để bảo vệ account trong các lab sau.
- Nếu dừng tại đây: vẫn nên giữ budget. Budget không tạo AWS resource chạy liên tục.

## Troubleshooting

- `Unable to locate credentials`: chạy lại `aws configure` hoặc kiểm tra profile.
- `AccessDenied`: user/role chưa có quyền gọi service.
- Sai region: export lại `AWS_REGION` và `AWS_DEFAULT_REGION`.
